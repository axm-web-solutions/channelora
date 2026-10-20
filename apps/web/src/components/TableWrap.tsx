import { useLayoutEffect, useRef, type ReactNode } from 'react'

// Contenedor de tabla: en escritorio desplaza en horizontal; en móvil el CSS apila cada fila como tarjeta
// usando como etiqueta el texto de la cabecera de su columna (data-label).
export function TableWrap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const table = ref.current?.querySelector('table')
    if (!table) return
    const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent?.trim() ?? '')
    table.querySelectorAll('tbody tr, tfoot tr').forEach(tr => [...tr.children].forEach((td, i) => {
      if (heads[i] && !td.hasAttribute('colspan')) td.setAttribute('data-label', heads[i])
    }))
  })
  return <div className="table-wrap" ref={ref}>{children}</div>
}
