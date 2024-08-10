---
theme: dashboard
---
```js
import data from './data/stars.js'
```

# Starred Repos


```js
const search = view(Inputs.search(data, {placeholder: "Search data…"}));

function avatar (x) {
  const size = 20
  return  htl.html`<img src="${x}" style="height: ${size}px; width: ${size}px;" />`
}
const link = (url, label) => htl.html`<a href="${url}">${label}</a>`
const dateFormat = x => x.toLocaleString(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric", 
  minute: "numeric", 
  second: "numeric"
})
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
      homepage: link,
      starred_at: dateFormat,
      created_at: dateFormat,
      updated_at: dateFormat,
      pushed_at: dateFormat
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