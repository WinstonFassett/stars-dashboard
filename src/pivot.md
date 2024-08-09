```js
import {Card} from "./components/Card.js";
import {html} from "npm:htl";
// import d3 from 'npm:d3'
// import plotly from 'npm:plotly.js'
// import Plotly from 

```

<link rel="stylesheet" href="npm:jquery-ui/dist/themes/base/jquery-ui.css">

<link href="https://pivottable.js.org/dist/pivot.css" rel="stylesheet" />

<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" />


```js echo
const $ = (await import( "npm:jquery")).default;
console.log({ $ })
self.jQuery = $;
self.$ = $
await import("npm:jquery-ui");
await import('npm:plotly.js-dist-min')
await import("https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.34.0/plotly.min.js")
await import('https://cdnjs.cloudflare.com/ajax/libs/pivottable/2.23.0/plotly_renderers.min.js')
await import ( 'npm:pivottable')
```


# Pivot Table

```js
var dom = html`<div id="app" style="overflow:auto;"></div>`;
display(dom)


$(() => {
  var derivers = $.pivotUtilities.derivers;
  var renderers = $.extend($.pivotUtilities.renderers,
      $.pivotUtilities.plotly_renderers);
    console.log({ renderers })
  $(dom).pivotUI(
      [
          {color: "blue", shape: "circle"},
          {color: "red", shape: "triangle"}
      ],
      {
          rows: ["color"],
          cols: ["shape"],
          rendererName: "Horizontal Stacked Bar Chart",
          renderers: renderers          
      }
  );      
})

```

<style>
  #app {
    color: black;
    --theme-foreground: black;
    --theme-foreground-alt: black;
  }
</style>

