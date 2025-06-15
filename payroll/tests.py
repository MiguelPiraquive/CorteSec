from django.test import TestCase
from .models import Payroll

class PayrollModelTest(TestCase):
    def setUp(self):
        Payroll.objects.create(employee_name="John Doe", amount=1000)

    def test_payroll_creation(self):
        payroll = Payroll.objects.get(employee_name="John Doe")
        self.assertEqual(payroll.amount, 1000)

    def test_payroll_str(self):
        payroll = Payroll.objects.get(employee_name="John Doe")
        self.assertEqual(str(payroll), "John Doe - $1000")