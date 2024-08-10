---
theme: dashboard
---
```js
import $ from 'npm:jquery'
import data from './data/stars.js'
window.$ = $
```

# Starred Repos


```js
const search = view(Inputs.search(data, {placeholder: "Search data…"}));

function avatar (x) {
  const size = 20
  return  htl.html`<img src="${x}" style="height: ${size}px; width: ${size}px;" />`
}
const link = (url, label = url) => htl.html`<a href="${url}">${label}</a>`
const dateFormat = x => x.toLocaleString(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric", 
  minute: "numeric", 
  second: "numeric"
})
const csvTags = str => htl.html`<div>
  ${str.split(', ').map((x, o) => {
    const node = htl.html`<a href="#${x}">${x}</a>`
    node.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      const $input = $('[type="search"]')
      console.log('click', x, $input)
      const form = $input.closest('form')[0]
      form.query = x
      $input[0].dispatchEvent(new Event("input", {bubbles: true}));
      // $input.val(x).trigger('input').trigger('change')
    })
    const nodes = [node]
    if (o > 0) {
      nodes.unshift(htl.html`<span>, </span>`)
    }
    return htl.html`${nodes}`
  })}
  
</div>`
```


<div class="grid grid-cols-1">
  <div class="card">${resize(width => (Inputs.table(search, { 
    select: false,
    rows: 20,
    width: {
      avatar: 20,
      full_name: Math.max(150, width * .3),
      'description': Math.max(150, width * .3),
      'topics': Math.max(150, width * .3),
      'license_name': 100,
      stargazers_count: 80,
      forks_count: 50,
      homepage: 150
    }, 
    format: {
      full_name: full_name => link(`https://github.com/${full_name}`, full_name),
      avatar: avatar,
      homepage: x => link(x),
      starred_at: dateFormat,
      created_at: dateFormat,
      updated_at: dateFormat,
      pushed_at: dateFormat,
      topics: csvTags,
    },
    maxWidth: width,  })))}</div>
</div>


```js
function sparkbar(max) {
  return (x) => htl.html`<div style="
    background: var(--theme-green);
    color: black;
    font: 10px/1.6 var(--sans-serif);
    width: ${100 * x / max}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${x.toLocaleString("en-US")}`
}
```

<!-- ## Raw Data 
```js
display(search)
``` -->