---
theme: dashboard
---

```js
import {Card} from "./components/Card.js";
import {html} from "npm:htl";
```

```js
import data from './data/stars.js'
```

<link rel="stylesheet" href="npm:jquery-ui/dist/themes/base/jquery-ui.css">
<link href="https://pivottable.js.org/dist/pivot.css" rel="stylesheet" />
<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" />

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js"></script>

<style>
  #app {
    color: black;
    --theme-foreground: black;
    --theme-foreground-alt: black;
    position: relative;
  }
  .node {
    border: solid 1px white;
    font: 10px sans-serif;
    line-height: 12px;
    overflow: hidden;
    position: absolute;
    text-indent: 2px;
  }  
</style>

```js 
const $ = (await import( "npm:jquery")).default;
self.jQuery = $;
self.$ = $
await import("npm:jquery-ui");
await import('npm:plotly.js-dist-min')
await import("https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.34.0/plotly.min.js")
await import ( 'npm:pivottable')
await import('https://cdnjs.cloudflare.com/ajax/libs/pivottable/2.23.0/plotly_renderers.min.js')
await import('https://cdnjs.cloudflare.com/ajax/libs/pivottable/2.23.0/d3_renderers.min.js')
```

# Pivot

```js
var dom = html`<div id="app" style="overflow:auto;"></div>`;
display(dom)

$(() => {
  var derivers = $.pivotUtilities.derivers;
  var renderers = $.extend($.pivotUtilities.renderers,
      $.pivotUtilities.plotly_renderers,
      $.pivotUtilities.d3_renderers);
  $(dom).pivotUI(
      data,
      {
          rows: ["language"],
          // cols: ["shape"],
          rendererName: "Treemap",
          renderers: renderers          
      }
  );      
})
```
