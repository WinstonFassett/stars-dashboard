var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// lib/web.ts
import * as mc from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import * as msql from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";

// lib/clients/DataTable.ts
import * as arrow2 from "https://esm.sh/apache-arrow@16.1.0";
import {
  MosaicClient as MosaicClient5,
  Selection as Selection2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import { desc, Query as Query5 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
import * as signals from "https://esm.sh/@preact/signals-core@1.6.1";
import { html } from "https://esm.sh/htl@0.3.1";

// lib/utils/assert.ts
var AssertionError = class extends Error {
  /** @param message The error message. */
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
};
function assert(expr, msg = "") {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

// lib/utils/AsyncBatchReader.ts
var AsyncBatchReader = class {
  /** the iterable batches to read */
  #batches = [];
  /** the index of the current row */
  #index = 0;
  /** resolves a promise for when the next batch is available */
  #resolve = null;
  /** the current batch */
  #current = null;
  /** A function to request more data. */
  #requestNextBatch;
  /**
   * @param requestNextBatch - a function to request more data. When
   * this function completes, it should enqueue the next batch, otherwise the
   * reader will be stuck.
   */
  constructor(requestNextBatch) {
    this.#requestNextBatch = requestNextBatch;
  }
  /**
   * Enqueue a batch of data
   *
   * The last batch should have `last: true` set,
   * so the reader can terminate when it has
   * exhausted all the data.
   *
   * @param batch - the batch of data to enqueue
   * @param options
   * @param options.last - whether this is the last batch
   */
  enqueueBatch(batch, { last }) {
    this.#batches.push({ data: batch, last });
    if (this.#resolve) {
      this.#resolve();
      this.#resolve = null;
    }
  }
  async next() {
    if (!this.#current) {
      if (this.#batches.length === 0) {
        let promise = new Promise((resolve) => {
          this.#resolve = resolve;
        });
        this.#requestNextBatch();
        await promise;
      }
      let next = this.#batches.shift();
      assert(next, "No next batch");
      this.#current = next;
    }
    let result = this.#current.data.next();
    if (result.done) {
      if (this.#current.last) {
        return { done: true, value: void 0 };
      }
      this.#current = null;
      return this.next();
    }
    return {
      done: false,
      value: { row: result.value, index: this.#index++ }
    };
  }
};

// lib/utils/formatting.ts
import { Temporal } from "https://esm.sh/@js-temporal/polyfill@0.4.4";
import * as arrow from "https://esm.sh/apache-arrow@16.1.0";
function fmt(_arrowDataTypeValue, format3, log = false) {
  return (value) => {
    if (log)
      console.log(value);
    if (value === void 0 || value === null) {
      return stringify(value);
    }
    return format3(value);
  };
}
function stringify(x) {
  return `${x}`;
}
function formatDataType(type) {
  if (arrow.DataType.isLargeBinary(type))
    return "large binary";
  if (arrow.DataType.isLargeUtf8(type))
    return "large utf8";
  return type.toString().toLowerCase().replace("<second>", "[s]").replace("<millisecond>", "[ms]").replace("<microsecond>", "[\xB5s]").replace("<nanosecond>", "[ns]").replace("<day>", "[day]").replace("dictionary<", "dict<");
}
function formatterForValue(type) {
  if (arrow.DataType.isNull(type)) {
    return fmt(type.TValue, stringify);
  }
  if (arrow.DataType.isInt(type) || arrow.DataType.isFloat(type)) {
    return fmt(type.TValue, (value) => {
      if (Number.isNaN(value))
        return "NaN";
      return value === 0 ? "0" : value.toLocaleString("en");
    });
  }
  if (arrow.DataType.isBinary(type) || arrow.DataType.isFixedSizeBinary(type) || arrow.DataType.isLargeBinary(type)) {
    return fmt(type.TValue, (bytes) => {
      let maxlen = 32;
      let result = "b'";
      for (let i = 0; i < Math.min(bytes.length, maxlen); i++) {
        const byte = bytes[i];
        if (byte >= 32 && byte <= 126) {
          result += String.fromCharCode(byte);
        } else {
          result += "\\x" + ("00" + byte.toString(16)).slice(-2);
        }
      }
      if (bytes.length > maxlen)
        result += "...";
      result += "'";
      return result;
    });
  }
  if (arrow.DataType.isUtf8(type) || arrow.DataType.isLargeUtf8(type)) {
    return fmt(type.TValue, (text) => text);
  }
  if (arrow.DataType.isBool(type)) {
    return fmt(type.TValue, stringify);
  }
  if (arrow.DataType.isDecimal(type)) {
    return fmt(type.TValue, () => "TODO");
  }
  if (arrow.DataType.isDate(type)) {
    return fmt(type.TValue, (ms) => {
      return Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO("UTC").toPlainDate().toString();
    });
  }
  if (arrow.DataType.isTime(type)) {
    return fmt(type.TValue, (ms) => {
      return instantFromTimeUnit(ms, type.unit).toZonedDateTimeISO("UTC").toPlainTime().toString();
    });
  }
  if (arrow.DataType.isTimestamp(type)) {
    return fmt(type.TValue, (ms) => {
      return Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO("UTC").toPlainDateTime().toString();
    });
  }
  if (arrow.DataType.isInterval(type)) {
    return fmt(type.TValue, (_value) => {
      return "TODO";
    });
  }
  if (arrow.DataType.isDuration(type)) {
    return fmt(type.TValue, (bigintValue) => {
      return durationFromTimeUnit(bigintValue, type.unit).toString();
    });
  }
  if (arrow.DataType.isList(type)) {
    return fmt(type.TValue, (value) => {
      return value.toString();
    });
  }
  if (arrow.DataType.isStruct(type)) {
    return fmt(type.TValue, (value) => {
      return value.toString();
    });
  }
  if (arrow.DataType.isUnion(type)) {
    return fmt(type.TValue, (_value) => {
      return "TODO";
    });
  }
  if (arrow.DataType.isMap(type)) {
    return fmt(type.TValue, (_value) => {
      return "TODO";
    });
  }
  if (arrow.DataType.isDictionary(type)) {
    let formatter = formatterForValue(type.dictionary);
    return fmt(type.TValue, formatter);
  }
  return () => `Unsupported type: ${type}`;
}
function instantFromTimeUnit(value, unit) {
  if (unit === arrow.TimeUnit.SECOND) {
    if (typeof value === "bigint")
      value = Number(value);
    return Temporal.Instant.fromEpochSeconds(value);
  }
  if (unit === arrow.TimeUnit.MILLISECOND) {
    if (typeof value === "bigint")
      value = Number(value);
    return Temporal.Instant.fromEpochMilliseconds(value);
  }
  if (unit === arrow.TimeUnit.MICROSECOND) {
    if (typeof value === "number")
      value = BigInt(value);
    return Temporal.Instant.fromEpochMicroseconds(value);
  }
  if (unit === arrow.TimeUnit.NANOSECOND) {
    if (typeof value === "number")
      value = BigInt(value);
    return Temporal.Instant.fromEpochNanoseconds(value);
  }
  throw new Error("Invalid TimeUnit");
}
function durationFromTimeUnit(value, unit) {
  value = Number(value);
  if (unit === arrow.TimeUnit.SECOND) {
    return Temporal.Duration.from({ seconds: value });
  }
  if (unit === arrow.TimeUnit.MILLISECOND) {
    return Temporal.Duration.from({ milliseconds: value });
  }
  if (unit === arrow.TimeUnit.MICROSECOND) {
    return Temporal.Duration.from({ microseconds: value });
  }
  if (unit === arrow.TimeUnit.NANOSECOND) {
    return Temporal.Duration.from({ nanoseconds: value });
  }
  throw new Error("Invalid TimeUnit");
}

// lib/clients/Histogram.ts
import {
  MosaicClient
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import { count, Query } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
import * as mplot from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-plot@0.10.0/+esm";

// lib/utils/CrossfilterHistogramPlot.ts
import { effect, signal } from "https://esm.sh/@preact/signals-core@1.6.1";

// lib/deps/d3.ts
var d3_exports = {};
__reExport(d3_exports, d3_selection_star);
__reExport(d3_exports, d3_scale_star);
__reExport(d3_exports, d3_axis_star);
__reExport(d3_exports, d3_format_star);
__reExport(d3_exports, d3_time_format_star);
import * as d3_selection_star from "https://esm.sh/d3-selection@3.0.0";
import * as d3_scale_star from "https://esm.sh/d3-scale@4.0.2";
import * as d3_axis_star from "https://esm.sh/d3-axis@3.0.0";
import * as d3_format_star from "https://esm.sh/d3-format@3.1.0";
import * as d3_time_format_star from "https://esm.sh/d3-time-format@4.1.0";

// lib/utils/tick-formatter-for-bins.ts
var YEAR = "year";
var MONTH = "month";
var DAY = "day";
var HOUR = "hour";
var MINUTE = "minute";
var SECOND = "second";
var MILLISECOND = "millisecond";
var durationSecond = 1e3;
var durationMinute = durationSecond * 60;
var durationHour = durationMinute * 60;
var durationDay = durationHour * 24;
var durationWeek = durationDay * 7;
var durationMonth = durationDay * 30;
var durationYear = durationDay * 365;
var intervals = [
  [SECOND, 1, durationSecond],
  [SECOND, 5, 5 * durationSecond],
  [SECOND, 15, 15 * durationSecond],
  [SECOND, 30, 30 * durationSecond],
  [MINUTE, 1, durationMinute],
  [MINUTE, 5, 5 * durationMinute],
  [MINUTE, 15, 15 * durationMinute],
  [MINUTE, 30, 30 * durationMinute],
  [HOUR, 1, durationHour],
  [HOUR, 3, 3 * durationHour],
  [HOUR, 6, 6 * durationHour],
  [HOUR, 12, 12 * durationHour],
  [DAY, 1, durationDay],
  [DAY, 7, durationWeek],
  [MONTH, 1, durationMonth],
  [MONTH, 3, 3 * durationMonth],
  [YEAR, 1, durationYear]
];
var formatMap = {
  [MILLISECOND]: d3_exports.timeFormat("%L"),
  [SECOND]: d3_exports.timeFormat("%S s"),
  [MINUTE]: d3_exports.timeFormat("%H:%M"),
  [HOUR]: d3_exports.timeFormat("%H:%M"),
  [DAY]: d3_exports.timeFormat("%b %d"),
  [MONTH]: d3_exports.timeFormat("%b %Y"),
  [YEAR]: d3_exports.timeFormat("%Y")
};
function tickFormatterForBins(type, bins) {
  if (type === "number") {
    return d3_exports.format("~s");
  }
  let interval = timeInterval(
    bins[0].x0,
    bins[bins.length - 1].x1,
    bins.length
  );
  return formatMap[interval.interval];
}
function timeInterval(min, max, steps) {
  const span = max - min;
  const target = span / steps;
  let i = 0;
  while (i < intervals.length && intervals[i][2] < target) {
    i++;
  }
  if (i === intervals.length) {
    return { interval: YEAR, step: binStep(span, steps) };
  }
  if (i > 0) {
    let interval = intervals[target / intervals[i - 1][2] < intervals[i][2] / target ? i - 1 : i];
    return { interval: interval[0], step: interval[1] };
  }
  return { interval: MILLISECOND, step: binStep(span, steps, 1) };
}
function binStep(span, steps, minstep = 0, logb = Math.LN10) {
  let v;
  const level = Math.ceil(Math.log(steps) / logb);
  let step = Math.max(
    minstep,
    Math.pow(10, Math.round(Math.log(span) / logb) - level)
  );
  while (Math.ceil(span / step) > steps)
    step *= 10;
  const div = [5, 2];
  for (let i = 0, n = div.length; i < n; ++i) {
    v = step / div[i];
    if (v >= minstep && span / v <= steps)
      step = v;
  }
  return step;
}

// lib/utils/CrossfilterHistogramPlot.ts
function CrossfilterHistogramPlot(bins, {
  type = "number",
  width = 125,
  height = 40,
  marginTop = 0,
  marginRight = 2,
  marginBottom = 12,
  marginLeft = 2,
  nullCount = 0,
  fillColor = "var(--primary)",
  nullFillColor = "var(--secondary)",
  backgroundBarColor = "var(--moon-gray)"
}) {
  let hovered = signal(void 0);
  let nullBinWidth = nullCount === 0 ? 0 : 5;
  let spacing = nullBinWidth ? 4 : 0;
  let extent = (
    /** @type {const} */
    [
      Math.min(...bins.map((d) => d.x0)),
      Math.max(...bins.map((d) => d.x1))
    ]
  );
  let x = type === "date" ? d3_exports.scaleUtc() : d3_exports.scaleLinear();
  x.domain(extent).range([marginLeft + nullBinWidth + spacing, width - marginRight]).nice();
  let y = d3_exports.scaleLinear().domain([0, Math.max(nullCount, ...bins.map((d) => d.length))]).range([height - marginBottom, marginTop]);
  let svg = d3_exports.create("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]).attr("style", "max-width: 100%; height: auto; overflow: visible;");
  {
    svg.append("g").attr("fill", backgroundBarColor).selectAll("rect").data(bins).join("rect").attr("x", (d) => x(d.x0) + 1.5).attr("width", (d) => x(d.x1) - x(d.x0) - 1.5).attr("y", (d) => y(d.length)).attr("height", (d) => y(0) - y(d.length));
  }
  let foregroundBarGroup = svg.append("g").attr("fill", fillColor);
  const axes = svg.append("g").attr("transform", `translate(0,${height - marginBottom})`).call(
    d3_exports.axisBottom(x).tickValues([...x.domain(), 0]).tickFormat(tickFormatterForBins(type, bins)).tickSize(2.5)
  ).call((g) => {
    g.select(".domain").remove();
    g.attr("class", "gray");
    g.selectAll(".tick text").attr("text-anchor", (_, i) => ["start", "end", "start"][i]).attr("dx", (_, i) => ["-0.25em", "0.25em", "-0.25em"][i]);
  });
  const hoveredTickGroup = axes.node()?.querySelectorAll(".tick")[2];
  assert(hoveredTickGroup, "invariant");
  const hoveredTick = d3_exports.select(hoveredTickGroup);
  const hoverLabelBackground = hoveredTick.insert("rect", ":first-child").attr("width", 20).attr("height", 20).style("fill", "white");
  const fmt2 = type === "number" ? d3_exports.format(".3s") : tickFormatterForBins(type, bins);
  let [xmin, xmax] = x.domain();
  effect(() => {
    hoveredTick.attr("transform", `translate(${x(hovered.value ?? xmin)},0)`).attr("visibility", hovered.value ? "visible" : "hidden");
    hoveredTick.selectAll("text").text(`${fmt2(hovered.value ?? xmin)}`).attr("visibility", hovered.value ? "visible" : "hidden");
    const hoveredTickText = hoveredTick.select("text").node();
    const bbox = hoveredTickText.getBBox();
    const cond = x(hovered.value ?? xmin) + bbox.width > x(xmax);
    hoveredTickText.setAttribute("text-anchor", cond ? "end" : "start");
    hoveredTickText.setAttribute("dx", cond ? "-0.25em" : "0.25em");
    hoverLabelBackground.attr("visibility", hovered.value ? "visible" : "hidden").attr("transform", `translate(${(cond ? -bbox.width : 0) - 2.5}, 2.5)`).attr("width", bbox.width + 5).attr("height", bbox.height + 5);
  });
  let foregroundNullGroup = void 0;
  if (nullCount > 0) {
    let xnull = d3_exports.scaleLinear().range([marginLeft, marginLeft + nullBinWidth]);
    svg.append("g").attr("fill", backgroundBarColor).append("rect").attr("x", xnull(0)).attr("width", xnull(1) - xnull(0)).attr("y", y(nullCount)).attr("height", y(0) - y(nullCount));
    foregroundNullGroup = svg.append("g").attr("fill", nullFillColor).attr("color", nullFillColor);
    foregroundNullGroup.append("rect").attr("x", xnull(0)).attr("width", xnull(1) - xnull(0));
    let axisGroup = foregroundNullGroup.append("g").attr("transform", `translate(0,${height - marginBottom})`).append("g").attr("transform", `translate(${xnull(0.5)}, 0)`).attr("class", "tick");
    axisGroup.append("line").attr("stroke", "currentColor").attr("y2", 2.5);
    axisGroup.append("text").attr("fill", "currentColor").attr("y", 4.5).attr("dy", "0.71em").attr("text-anchor", "middle").text("\u2205").attr("font-size", "0.9em").attr("font-family", "var(--sans-serif)").attr("font-weight", "normal");
  }
  svg.selectAll(".tick").attr("font-family", "var(--sans-serif)").attr("font-weight", "normal");
  function render(bins2, nullCount2) {
    foregroundBarGroup.selectAll("rect").data(bins2).join("rect").attr("x", (d) => x(d.x0) + 1.5).attr("width", (d) => x(d.x1) - x(d.x0) - 1.5).attr("y", (d) => y(d.length)).attr("height", (d) => y(0) - y(d.length));
    foregroundNullGroup?.select("rect").attr("y", y(nullCount2)).attr("height", y(0) - y(nullCount2));
  }
  let scales = {
    x: Object.assign(x, {
      type: "linear",
      domain: x.domain(),
      range: x.range()
    }),
    y: Object.assign(y, {
      type: "linear",
      domain: y.domain(),
      range: y.range()
    })
  };
  let node = svg.node();
  assert(node, "Infallable");
  node.addEventListener("mousemove", (event) => {
    const relativeX = event.clientX - node.getBoundingClientRect().left;
    hovered.value = clamp(x.invert(relativeX), xmin, xmax);
  });
  node.addEventListener("mouseleave", () => {
    hovered.value = void 0;
  });
  render(bins, nullCount);
  return Object.assign(node, {
    /** @param {string} type */
    scale(type2) {
      let scale = scales[type2];
      assert(scale, "Invalid scale type");
      return scale;
    },
    /**
     * @param {Array<Bin>} bins
     * @param {{ nullCount: number }} opts
     */
    update(bins2, { nullCount: nullCount2 }) {
      render(bins2, nullCount2);
    },
    reset() {
      render(bins, nullCount);
    }
  });
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// lib/clients/Histogram.ts
var Histogram = class extends MosaicClient {
  #source;
  #el = document.createElement("div");
  #select;
  #interval = void 0;
  #initialized = false;
  #fieldInfo;
  svg;
  constructor(options) {
    super(options.filterBy);
    this.#source = options;
    let bin2 = mplot.bin(options.column)(this, "x");
    this.#select = { x1: bin2.x1, x2: bin2.x2, y: count() };
    this.#interval = new mplot.Interval1D(this, {
      channel: "x",
      selection: this.filterBy,
      field: this.#source.column,
      brush: void 0
    });
  }
  fields() {
    return [
      {
        table: this.#source.table,
        column: this.#source.column,
        stats: ["min", "max"]
      }
    ];
  }
  fieldInfo(info) {
    this.#fieldInfo = info[0];
    return this;
  }
  /**
   * Return a query specifying the data needed by this Mark client.
   * @param filter The filtering criteria to apply in the query.
   * @returns The client query
   */
  query(filter = []) {
    return Query.from({ source: this.#source.table }).select(this.#select).groupby(["x1", "x2"]).where(filter);
  }
  /**
   * Provide query result data to the mark.
   */
  queryResult(data) {
    let bins = Array.from(data, (d) => ({
      x0: d.x1,
      x1: d.x2,
      length: d.y
    }));
    let nullCount = 0;
    let nullBinIndex = bins.findIndex((b) => b.x0 == null);
    if (nullBinIndex >= 0) {
      nullCount = bins[nullBinIndex].length;
      bins.splice(nullBinIndex, 1);
    }
    if (!this.#initialized) {
      this.svg = CrossfilterHistogramPlot(bins, {
        nullCount,
        type: this.#source.type
      });
      this.#interval?.init(this.svg, null);
      this.#el.appendChild(this.svg);
      this.#initialized = true;
    } else {
      this.svg?.update(bins, { nullCount });
    }
    return this;
  }
  /* Required by the Mark interface */
  type = "rectY";
  /** Required by `mplot.bin` to get the field info. */
  channelField(channel) {
    assert(channel === "x");
    assert(this.#fieldInfo, "No field info yet");
    return this.#fieldInfo;
  }
  get plot() {
    return {
      node: () => this.#el,
      getAttribute(_name) {
        return void 0;
      }
    };
  }
};

// lib/clients/ValueCounts.ts
import { clausePoint, MosaicClient as MosaicClient2 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import {
  column,
  count as count2,
  Query as Query2,
  sql,
  sum
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
import { effect as effect3 } from "https://esm.sh/@preact/signals-core@1.6.1";

// lib/utils/ValueCountsPlot.ts
import { effect as effect2, signal as signal2 } from "https://esm.sh/@preact/signals-core@1.6.1";
function ValueCountsPlot(data, {
  width = 125,
  height = 30,
  marginBottom = 12,
  marginRight = 2,
  marginLeft = 2,
  fillColor = "var(--primary)",
  nullFillColor = "var(--secondary)",
  backgroundBarColor = "rgb(226, 226, 226)"
} = {}) {
  let root = document.createElement("div");
  root.style.position = "relative";
  let container = document.createElement("div");
  Object.assign(container.style, {
    width: `${width}px`,
    height: `${height}px`,
    display: "flex",
    borderRadius: "5px",
    overflow: "hidden"
  });
  let bars = createBars(data, {
    width,
    height,
    marginRight,
    marginLeft,
    fillColor,
    nullFillColor,
    backgroundBarColor
  });
  for (let bar of bars.elements) {
    container.appendChild(bar);
  }
  let text = createTextOutput();
  let hovering = signal2(void 0);
  let selected = signal2(void 0);
  let counts = signal2(data);
  let hitArea = document.createElement("div");
  Object.assign(hitArea.style, {
    position: "absolute",
    top: "0",
    left: "-5px",
    width: `${width + 10}px`,
    height: `${height + marginBottom}px`,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    cursor: "pointer"
  });
  hitArea.addEventListener("mousemove", (event) => {
    hovering.value = bars.nearestX(event);
  });
  hitArea.addEventListener("mouseout", () => {
    hovering.value = void 0;
  });
  hitArea.addEventListener("mousedown", (event) => {
    let next = bars.nearestX(event);
    selected.value = selected.value === next ? void 0 : next;
  });
  effect2(() => {
    text.textContent = bars.textFor(hovering.value ?? selected.value);
    bars.render(counts.value, hovering.value, selected.value);
  });
  root.appendChild(container);
  root.appendChild(text);
  root.appendChild(hitArea);
  return Object.assign(root, { selected, data: counts });
}
function createBar(opts) {
  let { title, fillColor, textColor, width, height } = opts;
  let bar = document.createElement("div");
  bar.title = title;
  Object.assign(bar.style, {
    background: createSplitBarFill({
      color: fillColor,
      bgColor: "var(--moon-gray)",
      frac: 50
    }),
    width: `${width}px`,
    height: `${height}px`,
    borderColor: "white",
    borderWidth: "0px 1px 0px 0px",
    borderStyle: "solid",
    opacity: 1,
    textAlign: "center",
    position: "relative",
    display: "flex",
    overflow: "hidden",
    alignItems: "center",
    fontWeight: 400,
    fontFamily: "var(--sans-serif)",
    boxSizing: "border-box"
  });
  let span = document.createElement("span");
  Object.assign(span.style, {
    overflow: "hidden",
    width: `calc(100% - 4px)`,
    left: "0px",
    position: "absolute",
    padding: "0px 2px",
    color: textColor
  });
  if (width > 10) {
    span.textContent = title;
  }
  bar.appendChild(span);
  return bar;
}
function prepareData(data) {
  let arr = data.toArray().toSorted((a, b) => b.total - a.total);
  let total = arr.reduce((acc, d) => acc + d.total, 0);
  return {
    bins: arr.filter(
      (d) => d.key !== "__quak_null__" && d.key !== "__quak_unique__"
    ),
    nullCount: arr.find((d) => d.key === "__quak_null__")?.total ?? 0,
    uniqueCount: arr.find((d) => d.key === "__quak_unique__")?.total ?? 0,
    total
  };
}
function createBars(data, opts) {
  let source = prepareData(data);
  let x = d3_exports.scaleLinear().domain([0, source.total]).range([opts.marginLeft, opts.width - opts.marginRight]);
  let thresh = 20;
  let bars = [];
  for (let d of source.bins.slice(0, thresh)) {
    let bar = createBar({
      title: d.key,
      fillColor: opts.fillColor,
      textColor: "white",
      width: x(d.total),
      height: opts.height
    });
    bars.push(Object.assign(bar, { data: d }));
  }
  let hoverBar = createVirtualSelectionBar(opts);
  let selectBar = createVirtualSelectionBar(opts);
  let virtualBar;
  if (source.bins.length > thresh) {
    let total = source.bins.slice(thresh).reduce(
      (acc, d) => acc + d.total,
      0
    );
    virtualBar = Object.assign(document.createElement("div"), {
      title: "__quak_virtual__"
    });
    Object.assign(virtualBar.style, {
      width: `${x(total)}px`,
      height: "100%",
      borderColor: "white",
      borderWidth: "0px 1px 0px 0px",
      borderStyle: "solid",
      opacity: 1
    });
    let vbars = document.createElement("div");
    Object.assign(vbars.style, {
      width: "100%",
      height: "100%",
      background: `repeating-linear-gradient(to right, ${opts.fillColor} 0px, ${opts.fillColor} 1px, white 1px, white 2px)`
    });
    virtualBar.appendChild(vbars);
    virtualBar.appendChild(hoverBar);
    virtualBar.appendChild(selectBar);
    Object.defineProperty(virtualBar, "data", {
      value: source.bins.slice(thresh)
    });
    bars.push(virtualBar);
  }
  if (source.uniqueCount) {
    let bar = createBar({
      title: "unique",
      fillColor: opts.backgroundBarColor,
      textColor: "var(--mid-gray)",
      width: x(source.uniqueCount),
      height: opts.height
    });
    bar.title = "__quak_unique__";
    bars.push(Object.assign(bar, {
      data: {
        key: "__quak_unique__",
        total: source.uniqueCount
      }
    }));
  }
  if (source.nullCount) {
    let bar = createBar({
      title: "null",
      fillColor: opts.nullFillColor,
      textColor: "white",
      width: x(source.nullCount),
      height: opts.height
    });
    bar.title = "__quak_null__";
    bars.push(Object.assign(bar, {
      data: {
        key: "__quak_null__",
        total: source.uniqueCount
      }
    }));
  }
  let first = bars[0];
  let last = bars[bars.length - 1];
  if (first === last) {
    first.style.borderRadius = "5px";
  } else {
    first.style.borderRadius = "5px 0px 0px 5px";
    last.style.borderRadius = "0px 5px 5px 0px";
  }
  function virtualBin(key) {
    assert(virtualBar);
    let voffset = bars.slice(0, thresh).map((b) => b.getBoundingClientRect().width).reduce((a, b) => a + b, 0);
    let vbins = virtualBar.data;
    let rect = virtualBar.getBoundingClientRect();
    let dx = rect.width / vbins.length;
    let idx = vbins.findIndex((d) => d.key === key);
    assert(idx !== -1, `key ${key} not found in virtual bins`);
    return {
      ...vbins[idx],
      x: dx * idx + voffset
    };
  }
  function reset(opactiy) {
    bars.forEach((bar) => {
      if (bar.title === "__quak_virtual__") {
        let vbars = bar.firstChild;
        vbars.style.opacity = opactiy.toString();
        vbars.style.background = createVirtualBarRepeatingBackground({
          color: opts.fillColor
        });
      } else {
        bar.style.opacity = opactiy.toString();
        bar.style.background = createSplitBarFill({
          color: bar.title === "__quak_unique__" ? opts.backgroundBarColor : bar.title === "__quak_null__" ? opts.nullFillColor : opts.fillColor,
          bgColor: opts.backgroundBarColor,
          frac: 1
        });
      }
      bar.style.borderColor = "white";
      bar.style.borderWidth = "0px 1px 0px 0px";
      bar.style.removeProperty("box-shadow");
    });
    bars[bars.length - 1].style.borderWidth = "0px";
    hoverBar.style.visibility = "hidden";
    selectBar.style.visibility = "hidden";
  }
  function hover(key, selected) {
    let bar = bars.find((b) => b.data.key === key);
    if (bar !== void 0) {
      bar.style.opacity = "1";
      return;
    }
    let vbin = virtualBin(key);
    hoverBar.title = vbin.key;
    hoverBar.data = vbin;
    hoverBar.style.opacity = selected ? "0.25" : "1";
    hoverBar.style.left = `${vbin.x}px`;
    hoverBar.style.visibility = "visible";
  }
  function select2(key) {
    let bar = bars.find((b) => b.data.key === key);
    if (bar !== void 0) {
      bar.style.opacity = "1";
      bar.style.boxShadow = "inset 0 0 0 1.2px black";
      return;
    }
    let vbin = virtualBin(key);
    selectBar.style.opacity = "1";
    selectBar.title = vbin.key;
    selectBar.data = vbin;
    selectBar.style.left = `${vbin.x}px`;
    selectBar.style.visibility = "visible";
  }
  let counts = Object.fromEntries(
    Array.from(data.toArray(), (d) => [d.key, d.total])
  );
  return {
    elements: bars,
    nearestX(event) {
      let bar = nearestX(event, bars);
      if (!bar)
        return;
      if (bar.title !== "__quak_virtual__") {
        return bar.data.key;
      }
      let rect = bar.getBoundingClientRect();
      let mouseX = event.clientX - rect.left;
      let data2 = bar.data;
      let idx = Math.floor(mouseX / rect.width * data2.length);
      return data2[idx].key;
    },
    render(data2, hovering, selected) {
      reset(hovering || selected ? 0.4 : 1);
      let update = Object.fromEntries(
        Array.from(data2.toArray(), (d) => [d.key, d.total])
      );
      let total = Object.values(update).reduce((a, b) => a + b, 0);
      for (let bar of bars) {
        if (bar.title === "__quak_virtual__") {
          let vbars = bar.firstChild;
          vbars.style.background = createVirtualBarRepeatingBackground({
            color: total < source.total || selected ? opts.backgroundBarColor : opts.fillColor
          });
        } else {
          let key = bar.data.key;
          let frac = (update[key] ?? 0) / counts[key];
          if (selected)
            frac = key === selected ? frac : 0;
          bar.style.background = createSplitBarFill({
            color: bar.title === "__quak_unique__" ? opts.backgroundBarColor : bar.title === "__quak_null__" ? opts.nullFillColor : opts.fillColor,
            bgColor: opts.backgroundBarColor,
            frac: isNaN(frac) ? 0 : frac
          });
        }
      }
      if (hovering !== void 0) {
        hover(hovering, selected);
      }
      if (selected !== void 0) {
        select2(selected);
      }
    },
    textFor(key) {
      if (key === void 0) {
        let ncats = data.numRows;
        return `${ncats.toLocaleString()} categor${ncats === 1 ? "y" : "ies"}`;
      }
      if (key === "__quak_unique__") {
        return `${source.uniqueCount.toLocaleString()} unique value${source.uniqueCount === 1 ? "" : "s"}`;
      }
      if (key === "__quak_null__") {
        return "null";
      }
      return key.toString();
    }
  };
}
function createTextOutput() {
  let node = document.createElement("div");
  Object.assign(node.style, {
    pointerEvents: "none",
    height: "15px",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    position: "absolute",
    fontWeight: 400,
    marginTop: "1.5px",
    color: "var(--mid-gray)"
  });
  return node;
}
function createVirtualSelectionBar(opts) {
  let node = document.createElement("div");
  Object.assign(node.style, {
    position: "absolute",
    top: "0",
    width: "1.5px",
    height: "100%",
    backgroundColor: opts.fillColor,
    pointerEvents: "none",
    visibility: "hidden"
  });
  return Object.assign(node, {
    data: { key: "", total: 0 }
  });
}
function nearestX({ clientX }, bars) {
  for (let bar of bars) {
    let rect = bar.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      return bar;
    }
  }
}
function createSplitBarFill(options) {
  let { color, bgColor, frac } = options;
  let p = frac * 100;
  return `linear-gradient(to top, ${color} ${p}%, ${bgColor} ${p}%, ${bgColor} ${100 - p}%)`;
}
function createVirtualBarRepeatingBackground({ color }) {
  return `repeating-linear-gradient(to right, ${color} 0px, ${color} 1px, white 1px, white 2px)`;
}

// lib/clients/ValueCounts.ts
var ValueCounts = class extends MosaicClient2 {
  #table;
  #column;
  #el = document.createElement("div");
  #plot;
  constructor(options) {
    super(options.filterBy);
    this.#table = options.table;
    this.#column = options.column;
    options.filterBy.addEventListener("value", async () => {
      let filters = options.filterBy.predicate();
      let query = this.query(filters);
      if (this.#plot) {
        let data = await this.coordinator.query(query);
        console.log("set valuecount plot data", data);
        this.#plot.data.value = data;
      }
    });
  }
  query(filter = []) {
    let counts = Query2.from({ source: this.#table }).select({
      value: sql`CASE
					WHEN ${column(this.#column)} IS NULL THEN '__quak_null__'
					ELSE ${column(this.#column)}
				END`,
      count: count2()
    }).groupby("value").where(filter);
    return Query2.with({ counts }).select(
      {
        key: sql`CASE
						WHEN "count" = 1 AND "value" != '__quak_null__' THEN '__quak_unique__'
						ELSE "value"
					END`,
        total: sum("count")
      }
    ).from("counts").groupby("key");
  }
  queryResult(data) {
    console.log("ValueCounts queryResult", data);
    if (!this.#plot) {
      let plot = this.#plot = ValueCountsPlot(data);
      this.#el.appendChild(plot);
      effect3(() => {
        let clause = this.clause(plot.selected.value);
        this.filterBy.update(clause);
      });
    } else {
      this.#plot.data.value = data;
    }
    return this;
  }
  clause(value) {
    let update = value === "__quak_null__" ? null : value;
    return clausePoint(this.#column, update, {
      source: this
    });
  }
  reset() {
    assert(this.#plot, "ValueCounts plot not initialized");
    this.#plot.selected.value = void 0;
  }
  get plot() {
    return {
      node: () => this.#el
    };
  }
};

// lib/clients/TagCounts.ts
import { clausePoint as clausePoint2, MosaicClient as MosaicClient3 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import {
  column as column2,
  count as count3,
  Query as Query3,
  sql as sql2,
  sum as sum2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
import { effect as effect5 } from "https://esm.sh/@preact/signals-core@1.6.1";

// lib/utils/TagCountsPlot.ts
import { effect as effect4, signal as signal3 } from "https://esm.sh/@preact/signals-core@1.6.1";
function TagCountsPlot(data, {
  width = 125,
  height = 30,
  marginBottom = 12,
  marginRight = 2,
  marginLeft = 2,
  fillColor = "var(--primary)",
  nullFillColor = "var(--secondary)",
  backgroundBarColor = "rgb(226, 226, 226)"
} = {}) {
  let root = document.createElement("div");
  root.style.position = "relative";
  let container = document.createElement("div");
  Object.assign(container.style, {
    width: `${width}px`,
    height: `${height}px`,
    display: "flex",
    borderRadius: "5px",
    overflow: "hidden"
  });
  let bars = createBars2(data, {
    width,
    height,
    marginRight,
    marginLeft,
    fillColor,
    nullFillColor,
    backgroundBarColor
  });
  for (let bar of bars.elements) {
    container.appendChild(bar);
  }
  let text = createTextOutput2();
  let hovering = signal3(void 0);
  let selected = signal3(void 0);
  let counts = signal3(data);
  let hitArea = document.createElement("div");
  Object.assign(hitArea.style, {
    position: "absolute",
    top: "0",
    left: "-5px",
    width: `${width + 10}px`,
    height: `${height + marginBottom}px`,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    cursor: "pointer"
  });
  hitArea.addEventListener("mousemove", (event) => {
    hovering.value = bars.nearestX(event);
  });
  hitArea.addEventListener("mouseout", () => {
    hovering.value = void 0;
  });
  hitArea.addEventListener("mousedown", (event) => {
    let next = bars.nearestX(event);
    selected.value = selected.value === next ? void 0 : next;
  });
  effect4(() => {
    text.textContent = bars.textFor(hovering.value ?? selected.value);
    bars.render(counts.value, hovering.value, selected.value);
  });
  root.appendChild(container);
  root.appendChild(text);
  root.appendChild(hitArea);
  return Object.assign(root, { selected, data: counts });
}
function createBar2(opts) {
  let { title, fillColor, textColor, width, height } = opts;
  let bar = document.createElement("div");
  bar.title = title;
  Object.assign(bar.style, {
    background: createSplitBarFill2({
      color: fillColor,
      bgColor: "var(--moon-gray)",
      frac: 50
    }),
    width: `${width}px`,
    height: `${height}px`,
    borderColor: "white",
    borderWidth: "0px 1px 0px 0px",
    borderStyle: "solid",
    opacity: 1,
    textAlign: "center",
    position: "relative",
    display: "flex",
    overflow: "hidden",
    alignItems: "center",
    fontWeight: 400,
    fontFamily: "var(--sans-serif)",
    boxSizing: "border-box"
  });
  let span = document.createElement("span");
  Object.assign(span.style, {
    overflow: "hidden",
    width: `calc(100% - 4px)`,
    left: "0px",
    position: "absolute",
    padding: "0px 2px",
    color: textColor
  });
  if (width > 10) {
    span.textContent = title;
  }
  bar.appendChild(span);
  return bar;
}
function prepareData2(data) {
  let arr = data.toArray().toSorted((a, b) => b.total - a.total);
  let total = arr.reduce((acc, d) => acc + d.total, 0);
  console.log("ARR", arr);
  const ret = {
    bins: arr.filter(
      (d) => d.key !== "__quak_null__" && d.key !== "__quak_unique__"
    ),
    nullCount: arr.find((d) => d.key === "__quak_null__")?.total ?? 0,
    uniqueCount: arr.find((d) => d.key === "__quak_unique__")?.total ?? 0,
    total
  };
  console.log("RET", ret);
  return ret;
}
function createBars2(data, opts) {
  let source = prepareData2(data);
  let x = d3_exports.scaleLinear().domain([0, source.total]).range([opts.marginLeft, opts.width - opts.marginRight]);
  let thresh = 20;
  let bars = [];
  for (let d of source.bins.slice(0, thresh)) {
    let bar = createBar2({
      title: d.key,
      fillColor: opts.fillColor,
      textColor: "white",
      width: x(d.total),
      height: opts.height
    });
    bars.push(Object.assign(bar, { data: d }));
  }
  let hoverBar = createVirtualSelectionBar2(opts);
  let selectBar = createVirtualSelectionBar2(opts);
  let virtualBar;
  if (source.bins.length > thresh) {
    let total = source.bins.slice(thresh).reduce(
      (acc, d) => acc + d.total,
      0
    );
    virtualBar = Object.assign(document.createElement("div"), {
      title: "__quak_virtual__"
    });
    Object.assign(virtualBar.style, {
      width: `${x(total)}px`,
      height: "100%",
      borderColor: "white",
      borderWidth: "0px 1px 0px 0px",
      borderStyle: "solid",
      opacity: 1
    });
    let vbars = document.createElement("div");
    Object.assign(vbars.style, {
      width: "100%",
      height: "100%",
      background: `repeating-linear-gradient(to right, ${opts.fillColor} 0px, ${opts.fillColor} 1px, white 1px, white 2px)`
    });
    virtualBar.appendChild(vbars);
    virtualBar.appendChild(hoverBar);
    virtualBar.appendChild(selectBar);
    Object.defineProperty(virtualBar, "data", {
      value: source.bins.slice(thresh)
    });
    bars.push(virtualBar);
  }
  if (source.uniqueCount) {
    let bar = createBar2({
      title: "unique",
      fillColor: opts.backgroundBarColor,
      textColor: "var(--mid-gray)",
      width: x(source.uniqueCount),
      height: opts.height
    });
    bar.title = "__quak_unique__";
    bars.push(Object.assign(bar, {
      data: {
        key: "__quak_unique__",
        total: source.uniqueCount
      }
    }));
  }
  if (source.nullCount) {
    let bar = createBar2({
      title: "null",
      fillColor: opts.nullFillColor,
      textColor: "white",
      width: x(source.nullCount),
      height: opts.height
    });
    bar.title = "__quak_null__";
    bars.push(Object.assign(bar, {
      data: {
        key: "__quak_null__",
        total: source.uniqueCount
      }
    }));
  }
  let first = bars[0];
  let last = bars[bars.length - 1];
  if (first === last) {
    first.style.borderRadius = "5px";
  } else {
    first.style.borderRadius = "5px 0px 0px 5px";
    last.style.borderRadius = "0px 5px 5px 0px";
  }
  function virtualBin(key) {
    assert(virtualBar);
    let voffset = bars.slice(0, thresh).map((b) => b.getBoundingClientRect().width).reduce((a, b) => a + b, 0);
    let vbins = virtualBar.data;
    let rect = virtualBar.getBoundingClientRect();
    let dx = rect.width / vbins.length;
    let idx = vbins.findIndex((d) => d.key === key);
    assert(idx !== -1, `key ${key} not found in virtual bins`);
    return {
      ...vbins[idx],
      x: dx * idx + voffset
    };
  }
  function reset(opactiy) {
    bars.forEach((bar) => {
      if (bar.title === "__quak_virtual__") {
        let vbars = bar.firstChild;
        vbars.style.opacity = opactiy.toString();
        vbars.style.background = createVirtualBarRepeatingBackground2({
          color: opts.fillColor
        });
      } else {
        bar.style.opacity = opactiy.toString();
        bar.style.background = createSplitBarFill2({
          color: bar.title === "__quak_unique__" ? opts.backgroundBarColor : bar.title === "__quak_null__" ? opts.nullFillColor : opts.fillColor,
          bgColor: opts.backgroundBarColor,
          frac: 1
        });
      }
      bar.style.borderColor = "white";
      bar.style.borderWidth = "0px 1px 0px 0px";
      bar.style.removeProperty("box-shadow");
    });
    bars[bars.length - 1].style.borderWidth = "0px";
    hoverBar.style.visibility = "hidden";
    selectBar.style.visibility = "hidden";
  }
  function hover(key, selected) {
    let bar = bars.find((b) => b.data.key === key);
    if (bar !== void 0) {
      bar.style.opacity = "1";
      return;
    }
    let vbin = virtualBin(key);
    hoverBar.title = vbin.key;
    hoverBar.data = vbin;
    hoverBar.style.opacity = selected ? "0.25" : "1";
    hoverBar.style.left = `${vbin.x}px`;
    hoverBar.style.visibility = "visible";
  }
  function select2(key) {
    let bar = bars.find((b) => b.data.key === key);
    if (bar !== void 0) {
      bar.style.opacity = "1";
      bar.style.boxShadow = "inset 0 0 0 1.2px black";
      return;
    }
    let vbin = virtualBin(key);
    selectBar.style.opacity = "1";
    selectBar.title = vbin.key;
    selectBar.data = vbin;
    selectBar.style.left = `${vbin.x}px`;
    selectBar.style.visibility = "visible";
  }
  let counts = Object.fromEntries(
    Array.from(data.toArray(), (d) => [d.key, d.total])
  );
  return {
    elements: bars,
    nearestX(event) {
      let bar = nearestX2(event, bars);
      if (!bar)
        return;
      if (bar.title !== "__quak_virtual__") {
        return bar.data.key;
      }
      let rect = bar.getBoundingClientRect();
      let mouseX = event.clientX - rect.left;
      let data2 = bar.data;
      let idx = Math.floor(mouseX / rect.width * data2.length);
      return data2[idx].key;
    },
    render(data2, hovering, selected) {
      reset(hovering || selected ? 0.4 : 1);
      let update = Object.fromEntries(
        Array.from(data2.toArray(), (d) => [d.key, d.total])
      );
      let total = Object.values(update).reduce((a, b) => a + b, 0);
      for (let bar of bars) {
        if (bar.title === "__quak_virtual__") {
          let vbars = bar.firstChild;
          vbars.style.background = createVirtualBarRepeatingBackground2({
            color: total < source.total || selected ? opts.backgroundBarColor : opts.fillColor
          });
        } else {
          let key = bar.data.key;
          let frac = (update[key] ?? 0) / counts[key];
          if (selected)
            frac = key === selected ? frac : 0;
          bar.style.background = createSplitBarFill2({
            color: bar.title === "__quak_unique__" ? opts.backgroundBarColor : bar.title === "__quak_null__" ? opts.nullFillColor : opts.fillColor,
            bgColor: opts.backgroundBarColor,
            frac: isNaN(frac) ? 0 : frac
          });
        }
      }
      if (hovering !== void 0) {
        hover(hovering, selected);
      }
      if (selected !== void 0) {
        select2(selected);
      }
    },
    textFor(key) {
      if (key === void 0) {
        let ncats = data.numRows;
        return `${ncats.toLocaleString()} categor${ncats === 1 ? "y" : "ies"}`;
      }
      if (key === "__quak_unique__") {
        return `${source.uniqueCount.toLocaleString()} unique value${source.uniqueCount === 1 ? "" : "s"}`;
      }
      if (key === "__quak_null__") {
        return "null";
      }
      return key.toString();
    }
  };
}
function createTextOutput2() {
  let node = document.createElement("div");
  Object.assign(node.style, {
    pointerEvents: "none",
    height: "15px",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    position: "absolute",
    fontWeight: 400,
    marginTop: "1.5px",
    color: "var(--mid-gray)"
  });
  return node;
}
function createVirtualSelectionBar2(opts) {
  let node = document.createElement("div");
  Object.assign(node.style, {
    position: "absolute",
    top: "0",
    width: "1.5px",
    height: "100%",
    backgroundColor: opts.fillColor,
    pointerEvents: "none",
    visibility: "hidden"
  });
  return Object.assign(node, {
    data: { key: "", total: 0 }
  });
}
function nearestX2({ clientX }, bars) {
  for (let bar of bars) {
    let rect = bar.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      return bar;
    }
  }
}
function createSplitBarFill2(options) {
  let { color, bgColor, frac } = options;
  let p = frac * 100;
  return `linear-gradient(to top, ${color} ${p}%, ${bgColor} ${p}%, ${bgColor} ${100 - p}%)`;
}
function createVirtualBarRepeatingBackground2({ color }) {
  return `repeating-linear-gradient(to right, ${color} 0px, ${color} 1px, white 1px, white 2px)`;
}

// lib/clients/TagCounts.ts
import { isNotDistinct } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
import { literal } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
var TagCounts = class extends MosaicClient3 {
  #table;
  #column;
  #el = document.createElement("div");
  #plot;
  constructor(options) {
    super(options.filterBy);
    this.#table = options.table;
    this.#column = options.column;
  }
  /*
    Dimension query to adapt:
  
    select topic, count(full_name) as topic_count, sum(stargazers_count) as stargazers from
  (
  select full_name, stargazers_count,
  UNNEST(string_split(topics, ',')) AS topic 
  from stars
  ) as repo_topics
  group by topic
  order by topic_count desc
  
    */
  fields() {
    const before = super.fields();
    console.log("fields", before);
    return [
      // {
      //   table: this.#source.table,
      //   column: this.#source.column,
      //   stats: ["min", "max"],
      // },
    ];
  }
  query(filter = []) {
    console.log("QUERY", this.#column);
    let tagRows = Query3.from({ source: this.#table }).select({
      value: sql2`CASE 
          WHEN ${column2(this.#column)} IS NULL THEN UNNEST(['__quak_null__'])
          ELSE UNNEST(string_split(${column2(this.#column)}, ', '))
        END`
    }).where(filter);
    let counts = Query3.with({ tagRows }).from("tagRows").select({
      total: count3(),
      // key: sql`CASE
      //   WHEN "total" = 1 AND "value" != '__quak_null__' THEN '__quak_unique__'
      //   ELSE "value"
      // END`,
      key: sql2`value`
      // // value: sql`CASE
      // //   WHEN ${column(this.#column)} IS NULL THEN '__quak_null__'
      // //   ELSE value
      // // END`,
    }).groupby("key");
    let result = Query3.with({ counts }).from("counts").select({
      // key: "key",
      key: sql2`CASE 
          WHEN total = 1 AND "key" != '__quak_null__' THEN '__quak_unique__'
          ELSE "key"
        END`,
      total: sum2("total")
    }).groupby(sql2`CASE 
        WHEN total = 1 AND "key" != '__quak_null__' THEN '__quak_unique__'
        ELSE "key"
      END`);
    return result;
  }
  queryResult(data) {
    if (!this.#plot) {
      console.log("plotcounts", { data });
      let plot = this.#plot = TagCountsPlot(data);
      this.#el.appendChild(plot);
      effect5(() => {
        let clause = this.clause(plot.selected.value);
        this.filterBy.update(clause);
      });
    } else {
      console.log("set plot data", data);
      this.#plot.data.value = data;
    }
    return this;
  }
  clause(value) {
    console.log("clause", value);
    let update = value === "__quak_null__" ? null : value;
    const origClause = clausePoint2(
      this.#column,
      update,
      {
        source: this
      }
    );
    console.log("origClause", origClause);
    const queryText = `%${value}%`;
    return {
      meta: { type: "point" },
      source: this,
      clients: /* @__PURE__ */ new Set([this]),
      // value: queryText,
      // predicate: sql``
      predicate: value === "__quak_null__" ? isNotDistinct(this.#column, null) : value !== void 0 ? like(this.#column, literal(queryText)) : null
    };
  }
  reset() {
    assert(this.#plot, "ValueCounts plot not initialized");
    this.#plot.selected.value = void 0;
  }
  get plot() {
    return {
      node: () => this.#el
    };
  }
};
var binaryOp = (op) => (a, b) => sql2`(${asColumn(a)} ${op} ${asColumn(b)})`.annotate({ op, a, b, visit });
var like = binaryOp(`like`);
function visit(callback) {
  callback(this.op, this);
  this.children?.forEach((v) => v.visit(callback));
}
function asColumn(value) {
  return typeof value === "string" ? column2(value) : value;
}

// lib/clients/DataTable.ts
import { signal as signal5 } from "https://esm.sh/@preact/signals-core@1.6.1";

// lib/clients/styles.css?raw
var styles_default = ':host {\n	all: initial;\n	--sans-serif: -apple-system, BlinkMacSystemFont, "avenir next", avenir, helvetica, "helvetica neue", ubuntu, roboto, noto, "segoe ui", arial, sans-serif;\n	--light-silver: #efefef;\n	--spacing-none: 0;\n	--white: #fff;\n	--gray: #929292;\n	--dark-gray: #333;\n	--moon-gray: #c4c4c4;\n	--mid-gray: #6e6e6e;\n\n	--stone-blue: #64748b;\n	--yellow-gold: #ca8a04;\n\n	--teal: #027982;\n	--dark-pink: #D35A5F;\n\n	--light-blue: #7E93CF;\n	--dark-yellow-gold: #A98447;\n\n	--purple: #987fd3;\n\n	--primary: var(--stone-blue);\n	--secondary: var(--yellow-gold);\n}\n\n.highlight {\n	background-color: var(--light-silver);\n}\n\n.highlight-cell {\n	border: 1px solid var(--moon-gray);\n}\n\n.quak {\n  border-radius: 0.2rem;\n  border: 1px solid var(--light-silver);\n  overflow-y: auto;\n}\n\ntable {\n  border-collapse: separate;\n  border-spacing: 0;\n  white-space: nowrap;\n  box-sizing: border-box;\n\n  margin: var(--spacing-none);\n  color: var(--dark-gray);\n  font: 13px / 1.2 var(--sans-serif);\n\n  width: 100%;\n}\n\nthead {\n  position: sticky;\n  vertical-align: top;\n  text-align: left;\n  top: 0;\n}\n\ntd {\n  border: 1px solid var(--light-silver);\n  border-bottom: solid 1px transparent;\n  border-right: solid 1px transparent;\n  overflow: hidden;\n  -o-text-overflow: ellipsis;\n  text-overflow: ellipsis;\n  padding: 4px 6px;\n}\n\ntr:first-child td {\n  border-top: solid 1px transparent;\n}\n\nth {\n  display: table-cell;\n  vertical-align: inherit;\n  font-weight: bold;\n  text-align: -internal-center;\n  unicode-bidi: isolate;\n\n  position: relative;\n  background: var(--white);\n  border-bottom: solid 1px var(--light-silver);\n  border-left: solid 1px var(--light-silver);\n  padding: 5px 6px;\n  user-select: none;\n}\n\n.number, .date {\n  font-variant-numeric: tabular-nums;\n}\n\n.gray {\n  color: var(--gray);\n}\n\n.number {\n  text-align: right;\n}\n\ntd:nth-child(1), th:nth-child(1) {\n  font-variant-numeric: tabular-nums;\n  text-align: center;\n  color: var(--moon-gray);\n  padding: 0 4px;\n}\n\ntd:first-child, th:first-child {\n  border-left: none;\n}\n\nth:first-child {\n  border-left: none;\n  vertical-align: top;\n  width: 20px;\n  padding: 7px;\n}\n\ntd:nth-last-child(2), th:nth-last-child(2) {\n  border-right: 1px solid var(--light-silver);\n}\n\ntr:first-child td {\n	border-top: solid 1px transparent;\n}\n\n.resize-handle {\n	width: 5px;\n	height: 100%;\n	background-color: transparent;\n	position: absolute;\n	right: -2.5px;\n	top: 0;\n	cursor: ew-resize;\n	z-index: 1;\n}\n\n.quak .sort-button {\n	cursor: pointer;\n	background-color: var(--white);\n	user-select: none;\n}\n\n.status-bar {\n	display: flex;\n	justify-content: flex-end;\n	font-family: var(--sans-serif);\n	margin-right: 10px;\n	margin-top: 5px;\n}\n\n.status-bar button {\n	border: none;\n	background-color: var(--white);\n	color: var(--primary);\n	font-weight: 600;\n	font-size: 0.875rem;\n	cursor: pointer;\n	margin-right: 5px;\n}\n\n.status-bar span {\n	color: var(--gray);\n	font-weight: 400;\n	font-size: 0.75rem;\n	font-variant-numeric: tabular-nums;\n}\n';

// lib/clients/StatusBar.ts
import { MosaicClient as MosaicClient4 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.10.0/+esm";
import { count as count4, Query as Query4 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.10.0/+esm";
var StatusBar = class extends MosaicClient4 {
  #table;
  #el = document.createElement("div");
  #button;
  #span;
  #totalRows = void 0;
  constructor(options) {
    super(options.filterBy);
    this.#table = options.table;
    this.#button = document.createElement("button");
    this.#button.innerText = "Reset";
    this.#span = document.createElement("span");
    let div = document.createElement("div");
    div.appendChild(this.#button);
    div.appendChild(this.#span);
    this.#el.appendChild(div);
    this.#el.classList.add("status-bar");
    this.#button.addEventListener("mousedown", () => {
      if (!this.filterBy)
        return;
      for (let { source } of this.filterBy.clauses) {
        if (!isInteractor(source)) {
          console.warn("Skipping non-interactor source", source);
          continue;
        }
        source.reset();
        this.filterBy.update(source.clause());
      }
    });
    this.#button.style.visibility = "hidden";
    this.filterBy?.addEventListener("value", () => {
      if (this.filterBy?.clauses.length === 0) {
        this.#button.style.visibility = "hidden";
      } else {
        this.#button.style.visibility = "visible";
      }
    });
  }
  query(filter = []) {
    console.log("statusbar query", this.#table, filter);
    let query = Query4.from(this.#table).select({ count: count4() }).where(filter);
    return query;
  }
  queryResult(table) {
    let count5 = Number(table.get(0)?.count ?? 0);
    if (!this.#totalRows) {
      this.#totalRows = count5;
    }
    let countStr = count5.toLocaleString();
    if (count5 == this.#totalRows) {
      this.#span.innerText = `${countStr} rows`;
    } else {
      let totalStr = this.#totalRows.toLocaleString();
      this.#span.innerText = `${countStr} of ${totalStr} rows`;
    }
    return this;
  }
  node() {
    return this.#el;
  }
};
function isObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function isInteractor(x) {
  return isObject(x) && "clause" in x && "reset" in x;
}

// lib/clients/DataTable.ts
async function datatable(table, options = {}) {
  assert(options.coordinator, "Must provide a coordinator");
  let empty = await options.coordinator.query(
    Query5.from(table).select(options.columns ?? ["*"]).limit(0).toString()
  );
  let client = new DataTable({
    table,
    schema: empty.schema,
    height: options.height,
    format: options.format
  });
  options.coordinator.connect(client);
  return client;
}
var DataTable = class extends MosaicClient5 {
  /** source of the data */
  #meta;
  /** for the component */
  #root = document.createElement("div");
  /** shadow root for the component */
  #shadowRoot = this.#root.attachShadow({ mode: "open" });
  /** header of the table */
  #thead = document.createElement("thead");
  /** body of the table */
  #tbody = document.createElement("tbody");
  /** The SQL order by */
  #orderby = [];
  /** template row for data */
  #templateRow = void 0;
  /** div containing the table */
  #tableRoot;
  /** offset into the data */
  #offset = 0;
  /** number of rows to fetch */
  #limit = 100;
  /** whether an internal request is pending */
  #pendingInternalRequest = true;
  /** number of rows to display */
  #rows = 11.5;
  /** height of a row */
  #rowHeight = 22;
  /** width of a column */
  #columnWidth = 125;
  /** height of the header */
  #headerHeight = "94px";
  /** the formatter for the data table entries */
  #format;
  /** @type {AsyncBatchReader<arrow.StructRowProxy> | null} */
  #reader = null;
  #sql = signal5(void 0);
  constructor(source) {
    super(Selection2.crossfilter());
    this.#format = formatof(source.schema);
    this.#meta = source;
    let maxHeight = `${(this.#rows + 1) * this.#rowHeight - 1}px`;
    if (source.height) {
      this.#rows = Math.floor(source.height / this.#rowHeight);
      maxHeight = `${source.height}px`;
    }
    let root = html`<div class="quak" style=${{
      maxHeight
    }}>`;
    root.appendChild(
      html.fragment`<table style=${{ tableLayout: "fixed" }}>${this.#thead}${this.#tbody}</table>`
    );
    this.#shadowRoot.appendChild(html`<style>${styles_default}</style>`);
    this.#shadowRoot.appendChild(root);
    this.#tableRoot = root;
    addDirectionalScrollWithPreventDefault(this.#tableRoot);
    this.#tableRoot.addEventListener("scroll", async () => {
      let isAtBottom = this.#tableRoot.scrollHeight - this.#tableRoot.scrollTop < this.#rows * this.#rowHeight * 1.5;
      if (isAtBottom) {
        await this.#appendRows(this.#rows);
      }
    });
  }
  get sql() {
    console.log("get sql", this.#sql.value);
    return this.#sql.value;
  }
  fields() {
    console.log("fields", this.#columns);
    return this.#columns.map((column3) => ({
      table: this.#meta.table,
      column: column3,
      stats: []
    }));
  }
  node() {
    return this.#root;
  }
  resize(height) {
    this.#rows = Math.floor(height / this.#rowHeight);
    this.#tableRoot.style.maxHeight = `${height}px`;
    this.#tableRoot.scrollTop = 0;
  }
  get #columns() {
    return this.#meta.schema.fields.map((field) => field.name);
  }
  /**
   * @param {Array<unknown>} filter
   */
  query(filter = []) {
    console.log("query", filter);
    let query = Query5.from(this.#meta.table).select(this.#columns).where(filter).orderby(
      this.#orderby.filter((o) => o.order !== "unset").map((o) => o.order === "asc" ? asc(o.field) : desc(o.field))
    );
    this.#sql.value = query.clone().toString();
    return query.limit(this.#limit).offset(this.#offset);
  }
  /**
   * A mosiac lifecycle function that is called with the results from `query`.
   * Must be synchronous, and return `this`.
   */
  queryResult(table) {
    console.log("query result", table);
    if (!this.#pendingInternalRequest) {
      this.#reader = new AsyncBatchReader(() => {
        this.#pendingInternalRequest = true;
        this.requestData(this.#offset + this.#limit);
      });
      this.#tbody.replaceChildren();
      this.#tableRoot.scrollTop = 0;
      this.#offset = 0;
    }
    let batch = table[Symbol.iterator]();
    this.#reader?.enqueueBatch(batch, {
      last: table.numRows < this.#limit
    });
    return this;
  }
  update() {
    console.log("update");
    if (!this.#pendingInternalRequest) {
      this.#appendRows(this.#rows * 2);
    }
    this.#pendingInternalRequest = false;
    return this;
  }
  requestData(offset = 0) {
    console.log("request data", offset);
    this.#offset = offset;
    let query = this.query(this.filterBy?.predicate(this));
    this.requestQuery(query);
    this.coordinator.prefetch(query.clone().offset(offset + this.#limit));
  }
  fieldInfo(infos) {
    let classes = classof(this.#meta.schema);
    console.log("field info", { infos, classes });
    {
      let statusBar = new StatusBar({
        table: this.#meta.table,
        filterBy: this.filterBy
      });
      this.coordinator.connect(statusBar);
      this.#shadowRoot.appendChild(statusBar.node());
    }
    this.#templateRow = html`<tr><td></td>${infos.map((info) => html.fragment`<td class=${classes[info.column]}></td>`)}
			<td style=${{ width: "99%", borderLeft: "none", borderRight: "none" }}></td>
		</tr>`;
    let observer = new IntersectionObserver((entries) => {
      for (let entry of entries) {
        if (!isTableColumnHeaderWithSvg(entry.target))
          continue;
        let vis = entry.target.vis;
        if (!vis)
          continue;
        if (entry.isIntersecting) {
          this.coordinator.connect(vis);
        } else {
          this.coordinator?.disconnect(vis);
        }
      }
    }, {
      root: this.#tableRoot
    });
    let cols = this.#meta.schema.fields.map((field) => {
      let info = infos.find((c) => c.column === field.name);
      assert(info, `No info for column ${field.name}`);
      let vis = void 0;
      const infoFormat = this.#meta.format?.[field.name];
      if (infoFormat) {
        console.log({ infoFormat });
        if (infoFormat === "tags") {
          vis = new TagCounts({
            table: this.#meta.table,
            column: field.name,
            filterBy: this.filterBy
          });
        }
      } else if (info.type === "number" || info.type === "date") {
        vis = new Histogram({
          table: this.#meta.table,
          column: field.name,
          type: info.type,
          filterBy: this.filterBy
        });
      } else {
        vis = new ValueCounts({
          table: this.#meta.table,
          column: field.name,
          filterBy: this.filterBy
        });
      }
      let th = thcol(field, this.#columnWidth, vis);
      observer.observe(th);
      return th;
    });
    signals.effect(() => {
      this.#orderby = cols.map((col, i) => ({
        field: this.#columns[i],
        order: col.sortState.value
      }));
      this.requestData();
    });
    this.#thead.appendChild(
      html`<tr style=${{ height: this.#headerHeight }}>
				<th></th>
				${cols}
				<th style=${{ width: "99%", borderLeft: "none", borderRight: "none" }}></th>
			</tr>`
    );
    {
      this.#tableRoot.addEventListener("mouseover", (event) => {
        if (isTableCellElement(event.target) && isTableRowElement(event.target.parentNode)) {
          const cell = event.target;
          const row = event.target.parentNode;
          highlight(cell, row);
        }
      });
      this.#tableRoot.addEventListener("mouseout", (event) => {
        if (isTableCellElement(event.target) && isTableRowElement(event.target.parentNode)) {
          const cell = event.target;
          const row = event.target.parentNode;
          removeHighlight(cell, row);
        }
      });
    }
    return this;
  }
  /** Number of rows to append */
  async #appendRows(nrows) {
    nrows = Math.trunc(nrows);
    while (nrows >= 0) {
      let result = await this.#reader?.next();
      if (!result || result?.done) {
        break;
      }
      this.#appendRow(result.value.row, result.value.index);
      nrows--;
      continue;
    }
  }
  #appendRow(d, i) {
    let itr = this.#templateRow?.cloneNode(true);
    assert(itr, "Must have a data row");
    let td = itr.childNodes[0];
    td.appendChild(document.createTextNode(String(i)));
    for (let j = 0; j < this.#columns.length; ++j) {
      td = itr.childNodes[j + 1];
      td.classList.remove("gray");
      let col = this.#columns[j];
      let stringified = this.#format[col](d[col]);
      if (shouldGrayoutValue(stringified)) {
        td.classList.add("gray");
      }
      let value = document.createTextNode(stringified);
      td.appendChild(value);
    }
    this.#tbody.append(itr);
  }
};
var TRUNCATE = (
  /** @type {const} */
  {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
);
function thcol(field, minWidth, vis) {
  let buttonVisible = signals.signal(false);
  let width = signals.signal(minWidth);
  let sortState = signals.signal(
    "unset"
  );
  function nextSortState() {
    sortState.value = {
      "unset": "asc",
      "asc": "desc",
      "desc": "unset"
    }[sortState.value];
  }
  let svg = html`<svg style=${{ width: "1.5em" }} fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
		<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9L12 5.25L15.75 9" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75L15.75 15" />
	</svg>`;
  let uparrow = svg.children[0];
  let downarrow = svg.children[1];
  let verticalResizeHandle = html`<div class="resize-handle"></div>`;
  let sortButton = html`<span aria-role="button" class="sort-button" onmousedown=${nextSortState}>${svg}</span>`;
  let th = html`<th style=${{ overflow: "hidden" }}>
		<div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
			<span style=${{ marginBottom: "5px", maxWidth: "250px", ...TRUNCATE }}>${field.name}</span>
			${sortButton}
		</div>
		${verticalResizeHandle}
		<span class="gray" style=${{ fontWeight: 400, fontSize: "12px", userSelect: "none" }}>${formatDataType(field.type)}</span>
		${vis?.plot?.node()}
	</th>`;
  signals.effect(() => {
    uparrow.setAttribute("stroke", "var(--moon-gray)");
    downarrow.setAttribute("stroke", "var(--moon-gray)");
    let element = { "asc": uparrow, "desc": downarrow, "unset": null }[sortState.value];
    element?.setAttribute("stroke", "var(--dark-gray)");
  });
  signals.effect(() => {
    sortButton.style.visibility = buttonVisible.value ? "visible" : "hidden";
  });
  signals.effect(() => {
    th.style.width = `${width.value}px`;
  });
  th.addEventListener("mouseover", () => {
    if (sortState.value === "unset")
      buttonVisible.value = true;
  });
  th.addEventListener("mouseleave", () => {
    if (sortState.value === "unset")
      buttonVisible.value = false;
  });
  th.addEventListener("dblclick", (event) => {
    if (event.offsetX < sortButton.offsetWidth && event.offsetY < sortButton.offsetHeight) {
      return;
    }
    width.value = minWidth;
  });
  verticalResizeHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    let startX = event.clientX;
    let startWidth = th.offsetWidth - parseFloat(getComputedStyle(th).paddingLeft) - parseFloat(getComputedStyle(th).paddingRight);
    function onMouseMove(event2) {
      let dx = event2.clientX - startX;
      width.value = Math.max(minWidth, startWidth + dx);
      verticalResizeHandle.style.backgroundColor = "var(--light-silver)";
    }
    function onMouseUp() {
      verticalResizeHandle.style.backgroundColor = "transparent";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
  verticalResizeHandle.addEventListener("mouseover", () => {
    verticalResizeHandle.style.backgroundColor = "var(--light-silver)";
  });
  verticalResizeHandle.addEventListener("mouseleave", () => {
    verticalResizeHandle.style.backgroundColor = "transparent";
  });
  return Object.assign(th, { vis, sortState });
}
function formatof(schema) {
  const format3 = /* @__PURE__ */ Object.create(
    null
  );
  for (const field of schema.fields) {
    format3[field.name] = formatterForValue(field.type);
  }
  return format3;
}
function classof(schema) {
  const classes = /* @__PURE__ */ Object.create(null);
  for (const field of schema.fields) {
    if (arrow2.DataType.isInt(field.type) || arrow2.DataType.isFloat(field.type)) {
      classes[field.name] = "number";
    }
    if (arrow2.DataType.isDate(field.type) || arrow2.DataType.isTimestamp(field.type)) {
      classes[field.name] = "date";
    }
  }
  return classes;
}
function highlight(cell, row) {
  if (row.firstChild !== cell && cell !== row.lastElementChild) {
    cell.style.border = "1px solid var(--moon-gray)";
  }
  row.style.backgroundColor = "var(--light-silver)";
}
function removeHighlight(cell, row) {
  cell.style.removeProperty("border");
  row.style.removeProperty("background-color");
}
function isTableCellElement(node) {
  return node?.tagName === "TD";
}
function isTableRowElement(node) {
  return node instanceof HTMLTableRowElement;
}
function shouldGrayoutValue(value) {
  return value === "null" || value === "undefined" || value === "NaN" || value === "TODO";
}
function isTableColumnHeaderWithSvg(node) {
  return node instanceof HTMLTableCellElement && "vis" in node;
}
function asc(field) {
  let expr = desc(field);
  expr._expr[0] = expr._expr[0].replace("DESC", "ASC");
  return expr;
}
function addDirectionalScrollWithPreventDefault(root, scrollThreshold = 10) {
  let accumulatedDeltaX = 0;
  let accumulatedDeltaY = 0;
  root.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      accumulatedDeltaX += event.deltaX;
      accumulatedDeltaY += event.deltaY;
      if (Math.abs(accumulatedDeltaX) > Math.abs(accumulatedDeltaY)) {
        if (Math.abs(accumulatedDeltaX) > scrollThreshold) {
          root.scrollLeft += accumulatedDeltaX;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
        }
      } else {
        if (Math.abs(accumulatedDeltaY) > scrollThreshold) {
          root.scrollTop += accumulatedDeltaY;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
        }
      }
    },
    { passive: false }
  );
}

// lib/web.ts
async function createQuak(source, options = {}) {
  let tableName = "df";
  let coordinator = new mc.Coordinator();
  let connector = mc.wasmConnector();
  let db = await connector.getDuckDB();
  coordinator.databaseConnector(connector);
  let exec;
  if (source) {
    exec = source.endsWith(".csv") ? msql.loadCSV(tableName, source, { replace: true }) : source.endsWith(".json") ? msql.loadJSON(tableName, source, { replace: true }) : msql.loadParquet(tableName, source, { replace: true });
  } else {
    console.log("no file specified");
    exec = "";
  }
  exec = exec.replace("json_format", "format");
  await coordinator.exec([exec]);
  let dt = await datatable(tableName, { coordinator, height: 500, ...options });
  let node = dt.node();
  console.log({ node });
  return node;
}
export {
  createQuak
};
