```js
import {createQuak} from './components/table.js'
```

# Quak

<style>
  .observablehq--block {
    background: white;
  }
</style>

```js
import data from './data/stars.js'
```

```js
createQuak(
// 'https://raw.githubusercontent.com/WinstonFassett/stars/main/stars.csv'
  data, {
  format: {
    topics: 'tags'
  }
})

```
