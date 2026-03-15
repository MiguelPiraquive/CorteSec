import { useState, useRef, useEffect } from 'react'
import { useActiveProject } from '../../context/ActiveProjectContext'
import { BriefcaseIcon, ChevronDownIcon, CheckIcon, XIcon, LayersIcon } from 'lucide-react'

const ProjectSelector = () => {
  const { activeProject, projects, isAllProjects, setActiveProject, clearActiveProject, loading } = useActiveProject()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (loading || projects.length === 0) return null

  const handleSelect = async (projectId) => {
    if (projectId === 'all') {
      await clearActiveProject()
    } else {
      await setActiveProject(projectId)
    }
    setOpen(false)
  }

  const displayName = isAllProjects
    ? 'Todos los proyectos'
    : (activeProject?.name || 'Seleccionar proyecto')

  const displayColor = isAllProjects ? '#6366f1' : (activeProject?.color || '#6366f1')

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200/50 max-w-[220px]"
      >
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: displayColor }}>
          {isAllProjects ? <LayersIcon className="w-3 h-3" /> : (activeProject?.name?.charAt(0)?.toUpperCase() || 'P')}
        </div>
        <span className="text-xs font-semibold text-indigo-700 truncate">{displayName}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-indigo-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold px-2 py-1">Proyecto activo</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {/* All projects option */}
            <button
              onClick={() => handleSelect('all')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${isAllProjects ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center shrink-0">
                <LayersIcon className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-sm font-medium flex-1">Todos los proyectos</span>
              {isAllProjects && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
            </button>

            <div className="h-px bg-gray-100 my-1" />

            {/* Individual projects */}
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${activeProject?.id === p.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: p.color || '#6366f1' }}>
                  {p.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  {p.codigo_proyecto && <div className="text-[10px] text-gray-400 font-mono">{p.codigo_proyecto}</div>}
                </div>
                {activeProject?.id === p.id && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectSelector
