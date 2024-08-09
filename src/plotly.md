# plotly 

```js
import Plotly from 'plotly.js-dist-min'
   
  var data1 = [];

  var layout = {
    title: 'Deaths at different risks by country',
    annotations: [{
    text: 'pickConditions',
      font: {
      size: 13,
      color: 'rgb(116, 101, 130)',
    },
    showarrow: false,
    align: 'center',
    x: 0.5,
    y: 1.1,
    xref: 'paper',
    yref: 'paper',
  }],
    autosize: true,
    margin:{
      l:100,
      b:100,
    },
    width: 800,
    height: 500,
    xaxis: {
        title : "Year",
        titlefont:{
          size:16
        },
        tickfont: {
        size: 10,
        color: 'rgb(107, 107, 107)'
      }
    },
    yaxis: {
      title: 'Number of deaths',
      titlefont: {
        size: 16,
        color: 'rgb(107, 107, 107)'
      },
      tickfont: {
        size: 10,
        color: 'rgb(107, 107, 107)'
      }
    },
    
  };

  const div = document.createElement('div');
  document.body.appendChild(div)
  Plotly.newPlot(div, [], layout, {width: width});
```