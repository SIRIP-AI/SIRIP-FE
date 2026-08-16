export function PageHeader({ title, description, action }) {
  return <header className="mb-6 flex items-end justify-between gap-5 max-[560px]:flex-col max-[560px]:items-stretch">
    <div className="max-w-2xl"><h1 className="text-3xl font-bold tracking-[-.04em]">{title}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
    <div className="shrink-0">{action}</div>
  </header>
}
