---
theme: dashboard
---
```js
import $ from 'npm:jquery'
import data from './data/stars.js'
import { link, search_terms, datetime, avatar } from './components/format.js'
window.$ = $
```

# Starred Repos


```js
const search = view(Inputs.search(data, {placeholder: "Search data…"}));

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
      starred_at: datetime,
      created_at: datetime,
      updated_at: datetime,
      pushed_at: datetime,
      topics: search_terms,
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