export default function ImportPromptsPage() {
  return (
    <div>
      <h1>Import Prompts (CSV)</h1>
      <form method="post" action="/api/admin/import-prompts" encType="text/plain" onSubmit={(e) => {
        const ta = document.getElementById('csv') as HTMLTextAreaElement
        if (!ta?.value) { e.preventDefault(); alert('Paste CSV content first.'); }
      }}>
        <p>Paste the CSV content from your prompts export and submit.</p>
        <textarea id="csv" name="csv" rows={18} style={{width:'100%'}} placeholder="Paste CSV file contents here" />
        <div style={{marginTop:12}}>
          <button type="submit" formAction="/api/admin/import-prompts">Import</button>
        </div>
      </form>
    </div>
  )
}
