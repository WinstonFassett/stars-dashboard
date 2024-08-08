---
theme: dashboard
---

# Starred Repos


```js

function cleanCsvHeader(csvString) {
  // Split the CSV string into lines
  const lines = csvString.split('\n');
  // Clean up the header row by trimming spaces
  const cleanedHeader = lines[0].split(',').map(header => header.trim()).join(',');
  // Combine the cleaned header with the rest of the CSV lines
  lines[0] = cleanedHeader;
  return lines.join('\n');
}

const text = d3.text('https://raw.githubusercontent.com/WinstonFassett/stars/main/stars.csv')
// const stars = data.csv({typed: true})
const data = text.then(text => {
  const cleaned =  cleanCsvHeader(text)
  const parsed = d3.csvParse(cleaned, d3.autoType)
  return parsed;
}).then(data => {
  return data.map(({ owner_avatar_url: avatar, full_name, description, stargazers_count, language, license_name, topics, homepage, starred_at, ...rest  }) => ({ avatar, full_name, description, stargazers_count, language, license_name, topics, homepage, starred_at, ...rest  }))
})


```

```js
const search = view(Inputs.search(data, {placeholder: "Search data…"}));

function avatar (x) {
  const size = 20
  return  htl.html`<img src="${x}" style="height: ${size}px; width: ${size}px;" />`
}
const link = url => htl.html`<a href="${url}">${url}</a>`
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
      full_name: full_name => link(`https://github.com/${full_name}`),
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