import {html} from "npm:htl";

export function avatar (x) {
  const size = 20
  return  html`<img src="${x}" style="height: ${size}px; width: ${size}px;" />`
}
export const link = (url, label = url) => html`<a href="${url}">${label}</a>`

export const datetime = x => x.toLocaleString(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric", 
  minute: "numeric", 
  second: "numeric"
})
export const search_terms = str => html`<div>
  ${str.split(', ').map((x, o) => {
    const node = html`<a href="#${x}">${x}</a>`
    node.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      const $input = $('[type="search"]')
      const form = $input.closest('form')[0]
      form.query = x
      $input[0].dispatchEvent(new Event("input", {bubbles: true}));
    })
    const nodes = [node]
    if (o > 0) {
      nodes.unshift(html`<span>, </span>`)
    }
    return html`${nodes}`
  })}
  
</div>`