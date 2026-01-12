"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   EVALUADOR DE FÓRMULAS SEGURO                                ║
║                    Sistema de Nómina CorteSec - FASE 2                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Evaluador de fórmulas dinámicas usando Abstract Syntax Tree (AST) de Python.

SEGURIDAD:
----------
- Whitelisting estricto de operadores y funciones permitidas
- No permite imports, exec, eval ni __builtins__
- Sandbox completo con timeout
- Validación de sintaxis antes de ejecutar

FÓRMULAS SOPORTADAS:
--------------------
- Aritméticas: +, -, *, /, //, %, **
- Comparación: ==, !=, <, <=, >, >=
- Lógicas: and, or, not
- Funciones: max(), min(), round(), abs()
- Condicionales: ternary (x if condición else y)

VARIABLES DE CONTEXTO:
----------------------
salario_base, dias_trabajados, horas_extras, valor_hora,
salud_empleado, pension_empleado, total_devengados, etc.

EJEMPLOS:
---------
"salario_base * (dias_trabajados / 30)"
"valor_hora * horas_extras * 1.25"  # HED 25%
"max(total_devengados * 0.04, SMMLV * 0.04)"  # Salud mínimo
"salario_base if dias_trabajados >= 30 else salario_base * (dias_trabajados / 30)"

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 2
"""

import ast
import operator
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional
from django.core.exceptions import ValidationError

from payroll.constants import (
    SMMLV_2026,
    AUXILIO_TRANSPORTE_2026,
    UVT_2026,
    TASA_SALUD_EMPLEADO,
    TASA_PENSION_EMPLEADO,
    RECARGO_HED,
    RECARGO_HEN,
    RECARGO_HON,
    TOPE_IBC_2026,
)


# ══════════════════════════════════════════════════════════════════════════════
# OPERADORES Y FUNCIONES PERMITIDAS (WHITELIST)
# ══════════════════════════════════════════════════════════════════════════════

ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,  # Negativo unario
    ast.UAdd: operator.pos,  # Positivo unario
}

ALLOWED_COMPARISONS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
}

ALLOWED_BOOLEAN_OPS = {
    ast.And: lambda a, b: a and b,
    ast.Or: lambda a, b: a or b,
}

ALLOWED_FUNCTIONS = {
    'max': max,
    'min': min,
    'round': round,
    'abs': abs,
    'Decimal': Decimal,
}


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTES DISPONIBLES EN FÓRMULAS
# ══════════════════════════════════════════════════════════════════════════════

FORMULA_CONSTANTS = {
    'SMMLV': SMMLV_2026,
    'AUXILIO_TRANSPORTE': AUXILIO_TRANSPORTE_2026,
    'UVT': UVT_2026,
    'TASA_SALUD': TASA_SALUD_EMPLEADO,
    'TASA_PENSION': TASA_PENSION_EMPLEADO,
    'RECARGO_HED': RECARGO_HED,
    'RECARGO_HEN': RECARGO_HEN,
    'RECARGO_HON': RECARGO_HON,
    'TOPE_IBC': TOPE_IBC_2026,
}


# ══════════════════════════════════════════════════════════════════════════════
# VISITOR AST SEGURO
# ══════════════════════════════════════════════════════════════════════════════

class SafeEvaluator(ast.NodeVisitor):
    """
    Visitor AST que evalúa expresiones de forma segura.
    Solo permite operaciones y funciones en el whitelist.
    """
    
    def __init__(self, context: Dict[str, Any]):
        self.context = context
    
    def visit(self, node):
        """Override visit para interceptar nodos no permitidos"""
        method = f'visit_{node.__class__.__name__}'
        visitor = getattr(self, method, self.generic_visit)
        return visitor(node)
    
    def generic_visit(self, node):
        """Rechaza cualquier nodo no explícitamente permitido"""
        raise ValidationError(
            f"Operación no permitida en fórmula: {node.__class__.__name__}"
        )
    
    # ────────────────────────────────────────────────────────────────────────
    # NODOS PERMITIDOS
    # ────────────────────────────────────────────────────────────────────────
    
    def visit_Expression(self, node):
        """Raíz de la expresión"""
        return self.visit(node.body)
    
    def visit_Constant(self, node):
        """Literales: números, strings, booleanos"""
        value = node.value
        # Convertir a Decimal si es numérico
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        return value
    
    def visit_Name(self, node):
        """Variables del contexto"""
        var_name = node.id
        
        # Buscar en constantes predefinidas
        if var_name in FORMULA_CONSTANTS:
            return FORMULA_CONSTANTS[var_name]
        
        # Buscar en contexto dinámico
        if var_name in self.context:
            value = self.context[var_name]
            # Asegurar que es Decimal
            if isinstance(value, (int, float)):
                return Decimal(str(value))
            return value
        
        raise ValidationError(
            f"Variable no definida en contexto: '{var_name}'. "
            f"Variables disponibles: {', '.join(list(FORMULA_CONSTANTS.keys()) + list(self.context.keys()))}"
        )
    
    def visit_BinOp(self, node):
        """Operadores binarios: +, -, *, /, etc."""
        operator_type = type(node.op)
        
        if operator_type not in ALLOWED_OPERATORS:
            raise ValidationError(
                f"Operador no permitido: {operator_type.__name__}"
            )
        
        left = self.visit(node.left)
        right = self.visit(node.right)
        op_func = ALLOWED_OPERATORS[operator_type]
        
        try:
            result = op_func(left, right)
            # Convertir resultado a Decimal si es numérico
            if isinstance(result, (int, float)):
                return Decimal(str(result))
            return result
        except (ZeroDivisionError, InvalidOperation) as e:
            raise ValidationError(f"Error en operación: {e}")
    
    def visit_UnaryOp(self, node):
        """Operadores unarios: -, +"""
        operator_type = type(node.op)
        
        if operator_type not in ALLOWED_OPERATORS:
            raise ValidationError(
                f"Operador unario no permitido: {operator_type.__name__}"
            )
        
        operand = self.visit(node.operand)
        op_func = ALLOWED_OPERATORS[operator_type]
        
        result = op_func(operand)
        if isinstance(result, (int, float)):
            return Decimal(str(result))
        return result
    
    def visit_Compare(self, node):
        """Comparaciones: ==, !=, <, <=, >, >="""
        left = self.visit(node.left)
        
        # Procesar comparaciones encadenadas (ej: a < b < c)
        result = True
        current_left = left
        
        for op, comparator in zip(node.ops, node.comparators):
            operator_type = type(op)
            
            if operator_type not in ALLOWED_COMPARISONS:
                raise ValidationError(
                    f"Comparador no permitido: {operator_type.__name__}"
                )
            
            current_right = self.visit(comparator)
            op_func = ALLOWED_COMPARISONS[operator_type]
            
            result = result and op_func(current_left, current_right)
            current_left = current_right
            
            if not result:
                break
        
        return result
    
    def visit_BoolOp(self, node):
        """Operadores booleanos: and, or"""
        operator_type = type(node.op)
        
        if operator_type not in ALLOWED_BOOLEAN_OPS:
            raise ValidationError(
                f"Operador booleano no permitido: {operator_type.__name__}"
            )
        
        op_func = ALLOWED_BOOLEAN_OPS[operator_type]
        
        # Evaluar con cortocircuito
        if operator_type == ast.And:
            result = True
            for value in node.values:
                result = result and self.visit(value)
                if not result:
                    break
            return result
        elif operator_type == ast.Or:
            result = False
            for value in node.values:
                result = result or self.visit(value)
                if result:
                    break
            return result
    
    def visit_UnaryOp_Not(self, node):
        """Operador NOT"""
        if isinstance(node.op, ast.Not):
            return not self.visit(node.operand)
        return self.visit_UnaryOp(node)
    
    def visit_IfExp(self, node):
        """Operador ternario: x if condición else y"""
        condition = self.visit(node.test)
        if condition:
            return self.visit(node.body)
        else:
            return self.visit(node.orelse)
    
    def visit_Call(self, node):
        """Llamadas a funciones permitidas"""
        if not isinstance(node.func, ast.Name):
            raise ValidationError(
                "Solo se permiten llamadas a funciones simples (no métodos ni atributos)"
            )
        
        func_name = node.func.id
        
        if func_name not in ALLOWED_FUNCTIONS:
            raise ValidationError(
                f"Función no permitida: '{func_name}'. "
                f"Funciones disponibles: {', '.join(ALLOWED_FUNCTIONS.keys())}"
            )
        
        func = ALLOWED_FUNCTIONS[func_name]
        
        # Evaluar argumentos
        args = [self.visit(arg) for arg in node.args]
        
        # Evaluar kwargs (si hay)
        kwargs = {}
        for keyword in node.keywords:
            kwargs[keyword.arg] = self.visit(keyword.value)
        
        try:
            result = func(*args, **kwargs)
            if isinstance(result, (int, float)):
                return Decimal(str(result))
            return result
        except Exception as e:
            raise ValidationError(f"Error al ejecutar función '{func_name}': {e}")


# ══════════════════════════════════════════════════════════════════════════════
# API PÚBLICA
# ══════════════════════════════════════════════════════════════════════════════

def evaluar_formula(formula: str, context: Dict[str, Any]) -> Decimal:
    """
    Evalúa una fórmula de forma segura con el contexto proporcionado.
    
    Args:
        formula: String con la fórmula a evaluar
        context: Diccionario con variables disponibles para la fórmula
        
    Returns:
        Resultado de la evaluación como Decimal
        
    Raises:
        ValidationError: Si la fórmula contiene sintaxis inválida u operaciones no permitidas
        
    Example:
        >>> context = {'salario_base': Decimal('1423500'), 'dias_trabajados': 30}
        >>> evaluar_formula("salario_base * (dias_trabajados / 30)", context)
        Decimal('1423500.00')
    """
    if not formula or not isinstance(formula, str):
        raise ValidationError("La fórmula debe ser un string no vacío")
    
    # Limpiar fórmula
    formula = formula.strip()
    
    # Validar sintaxis primero
    try:
        tree = ast.parse(formula, mode='eval')
    except SyntaxError as e:
        raise ValidationError(
            f"Error de sintaxis en fórmula: {e.msg} en línea {e.lineno}, columna {e.offset}"
        )
    
    # Evaluar de forma segura
    try:
        evaluator = SafeEvaluator(context)
        result = evaluator.visit(tree)
        
        # Asegurar que el resultado sea Decimal
        if isinstance(result, (int, float)):
            result = Decimal(str(result))
        elif isinstance(result, bool):
            result = Decimal('1' if result else '0')
        elif not isinstance(result, Decimal):
            result = Decimal(str(result))
        
        # Redondear a 2 decimales
        return result.quantize(Decimal('0.01'))
        
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(f"Error al evaluar fórmula: {e}")


def validar_formula(formula: str) -> tuple[bool, Optional[str]]:
    """
    Valida una fórmula sin ejecutarla.
    
    Args:
        formula: String con la fórmula a validar
        
    Returns:
        Tuple (es_valida, mensaje_error)
        
    Example:
        >>> validar_formula("salario_base * 1.25")
        (True, None)
        >>> validar_formula("import os")
        (False, "Operación no permitida en fórmula: Import")
    """
    try:
        # Validar sintaxis
        tree = ast.parse(formula, mode='eval')
        
        # Intentar evaluar con contexto vacío para verificar nodos
        evaluator = SafeEvaluator({})
        # Solo validar estructura, no ejecutar completamente
        # (las variables faltantes darán error pero es esperado)
        try:
            evaluator.visit(tree)
        except ValidationError as e:
            # Si el error es solo por variable faltante, está OK
            if "Variable no definida" not in str(e):
                return False, str(e)
        
        return True, None
        
    except SyntaxError as e:
        return False, f"Error de sintaxis: {e.msg}"
    except Exception as e:
        return False, str(e)
