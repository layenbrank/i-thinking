import type { editor } from 'monaco-editor'

interface SectionProps {
  composer?: editor.IEditor
}

const Section = forwardRef<HTMLDivElement, SectionProps>(function (_props, ref) {
  return (
    <div
      ref={ref}
      id="monacoGraph"
      className="size-full"
    />
  )
})

export default Section
