---
theme: dashboard
toc: false
---

# Weather report


```js
const forecast = FileAttachment("./data/forecast.json").json();
const data = d3.csv('https://raw.githubusercontent.com/WinstonFassett/stars/main/stars.csv')

function temperaturePlot(data, {width} = {}) {
  return Plot.plot({
    title: "Hourly temperature forecast",
    width,
    x: {type: "utc", ticks: "day", label: null},
    y: {grid: true, inset: 10, label: "Degrees (F)"},
    marks: [
      Plot.lineY(data.properties.periods, {
        x: "startTime",
        y: "temperature",
        z: null, // varying color, not series
        stroke: "temperature",
        curve: "step-after"
      })
    ]
  });
}

```

<div class="grid grid-cols-1">
  <div class="card">${resize((width) => temperaturePlot(forecast, {width}))}</div>
</div>


### Forecast JSON

```js
display(forecast);
```
