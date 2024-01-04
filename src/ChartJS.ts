import { log } from 'console';

interface TransformerOption {
  x_tick_size: number;
  y_tick_size: number;
  x_scale: number;
  y_scale: number;
  x_offset: number;
  y_offset: number;
}

type Point = [number, number];
type Line = [Point, Point];

enum AxisType {
  X,
  Y,
}

interface ChartOptions {
  canvas_width: number;
  canvas_height: number;
  xaxis_height: number;
  yaxis_width: number;
  transformer: Transformer;
  price_data: CandleStick[];
}

interface Tick {
  line: Line;
  text: {
    value: string;
    position: Point;
  };
}

interface AxisRenderInfo {
  line: Line;
  ticks: Tick[];
}

export type ChartRenderInfo = [
  AxisRenderInfo,
  AxisRenderInfo,
  CandleRenderInfo[]
];

export interface CandleStick {
  Open: number;
  Close: number;
  High: number;
  Low: number;
  UTC: string;
}

interface CandleRenderInfo {
  tail: Line;
  main: {
    position: Point;
    width: number;
    height: number;
    up: boolean;
  };
}

export class Transformer {
  x_tick_size: number;
  y_tick_size: number;

  x_offset: number;
  y_offset: number;

  x_scale: number;
  y_scale: number;

  constructor({
    x_tick_size,
    y_tick_size,
    x_offset,
    y_offset,
    x_scale,
    y_scale,
  }: TransformerOption) {
    this.x_tick_size = x_tick_size;
    this.y_tick_size = y_tick_size;
    this.x_offset = x_offset;
    this.y_offset = y_offset;
    this.x_scale = x_scale;
    this.y_scale = y_scale;
  }

  world_to_screen_x(x_coordinate: number): number {
    return x_coordinate * this.x_scale + this.x_offset;
  }

  world_to_screen_y(y_coordinate: number): number {
    return -y_coordinate * this.y_scale + this.y_offset;
  }

  // world_to_screen(p: Point): Point {
  //   return [
  //     p[0] * this.x_scale + this.x_offset,
  //     -p[1] * this.y_scale + this.y_offset,
  //   ];
  // }
  world_to_screen(p: Point): Point {
    return [this.world_to_screen_x(p[0]), this.world_to_screen_y(p[1])];
  }
  screen_to_world(p: Point): Point {
    return [
      (p[0] - this.x_offset) / this.x_scale,
      (this.y_offset - p[1]) / this.y_scale,
    ];
  }
  set_offset(pw: Point, ps: Point): void {
    this.x_offset = ps[0] - pw[0] * this.x_scale;
    this.y_offset = ps[1] + pw[1] * this.y_scale;
  }
}

// const transfomer: Transformer = new Transformer({
//   x_tick_size: 1,
//   y_tick_size: 1,
//   x_scale: 1,
//   y_scale: 1,
//   x_offset: 0,
//   y_offset: 0,
// });

// const pw: [number, number] = [1, 1];
// const ps: [number, number] = transfomer.world_to_screen(pw);

// deepEqual(ps, [1, -1]);

// [0, 1] -> [10, 0]

class Grid {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(
    price_data: CandleStick[],
    transfomer: Transformer
  ): CandleRenderInfo[] {
    const render_data: CandleRenderInfo[] = [];

    price_data.slice(0, 500).forEach((candle, index) => {
      const x: number = transfomer.world_to_screen_x(index);
      const y_max: number = transfomer.world_to_screen_y(
        Math.max(candle.Open, candle.Close)
      );
      const y_min: number = transfomer.world_to_screen_y(
        Math.min(candle.Open, candle.Close)
      );

      render_data.push({
        tail: [
          [x, transfomer.world_to_screen_y(candle.Low)],
          [x, transfomer.world_to_screen_y(candle.High)],
        ],
        main: {
          position: [x - 10, y_max],
          height: Math.abs(y_max - y_min),
          width: 20,
          up: candle.Open > candle.Close ? false : true,
        },
      });
    });

    return render_data;
  }
  // render(width: number, height: number): GridRenderInfo {}
}

class Axis {
  type: AxisType;
  width: number;
  height: number;
  constructor(type: AxisType, widht: number, height: number) {
    this.type = type;
    this.width = widht;
    this.height = height;
  }

  floor_point(p: Point, transfomer: Transformer): Point {
    const p_inworld = transfomer.screen_to_world(p);

    return [
      p_inworld[0] / transfomer.x_tick_size -
        (p_inworld[0] % transfomer.x_tick_size),
      p_inworld[1] / transfomer.y_tick_size -
        (p_inworld[1] % transfomer.y_tick_size),
    ];
  }

  /*
   * TODO: Figure out a better way to do this.
   */
  string_floor_point(p: Point, transfomer: Transformer) {
    console.log(p);
    const p_inworld = transfomer.screen_to_world(p);
    console.log('inworld: ', p_inworld);

    const stringp_inworld = [`${p_inworld[0]}`, `${p_inworld[1]}`];

    return [
      parseFloat(stringp_inworld[0].slice(0, 5)),
      parseFloat(stringp_inworld[1].slice(0, 5)),
    ];
  }

  render(
    grid_width: number,
    grid_height: number,
    transfomer: Transformer
  ): AxisRenderInfo {
    const line: Line =
      this.type == AxisType.X
        ? [
            [0, grid_height + 10],
            [this.width, grid_height + 10],
          ]
        : [
            [grid_width + 10, 0],
            [grid_width + 10, this.height],
          ];

    const ticks: Tick[] = [];

    if (this.type == AxisType.X) {
      const max_visible = this.floor_point(
        [grid_width, grid_height],
        transfomer
      );

      const min_visible = this.floor_point([0, 0], transfomer);

      for (
        let i = min_visible[0];
        i <= max_visible[0];
        i += transfomer.x_tick_size
      ) {
        const tick_x = transfomer.world_to_screen([i, 0])[0];
        ticks.push({
          line: [
            [tick_x, grid_height],
            [tick_x, 0],
          ],
          text: {
            value: '',
            position: [0, 0],
          },
        });
      }
    }
    if (this.type == AxisType.Y) {
      /*
       * TODO: Figure out a better way to do this.
       */
      const max_visible = this.string_floor_point(
        [grid_width, grid_height],
        transfomer
      );
      /*
       * TODO: Figure out a better way to do this.
       */
      const min_visible = this.string_floor_point([0, 0], transfomer);

      console.log('here start: ', min_visible);
      console.log('here end: ', max_visible);
      for (
        let i = min_visible[1];
        i >= max_visible[1];
        i -= transfomer.y_tick_size
      ) {
        const tick_y = transfomer.world_to_screen([0, i])[1];
        ticks.push({
          line: [
            [0, tick_y],
            [grid_width, tick_y],
          ],
          text: {
            value: '',
            position: [0, 0],
          },
        });
      }
    }

    return { line, ticks };
  }
}

export default class Chart {
  canvas_width: number;
  canvas_height: number;

  transfomer: Transformer;
  xAxis: Axis;
  yAxis: Axis;
  grid: Grid;

  price_data: CandleStick[];

  constructor({
    canvas_width,
    canvas_height,
    xaxis_height,
    yaxis_width,
    transformer,
    price_data,
  }: ChartOptions) {
    this.canvas_width = canvas_width;
    this.canvas_height = canvas_height;
    this.grid = new Grid(
      canvas_width - yaxis_width,
      canvas_height - xaxis_height
    );

    this.xAxis = new Axis(AxisType.X, this.grid.width, xaxis_height);
    this.yAxis = new Axis(AxisType.Y, yaxis_width, this.grid.height);

    this.transfomer = transformer;
    this.price_data = price_data;
  }

  render(): ChartRenderInfo {
    return [
      this.xAxis.render(this.grid.width, this.grid.height, this.transfomer),
      this.yAxis.render(this.grid.width, this.grid.height, this.transfomer),
      this.grid.render(this.price_data, this.transfomer),
    ];
  }
}

// const chart = new Chart({
//   canvas_height: 100,
//   canvas_width: 100,
//   xaxis_height: 10,
//   yaxis_width: 10,
//   transformer: new Transformer({
//     x_tick_size: 1,
//     y_tick_size: 0.001,
//     x_offset: 0,
//     y_offset: 90,
//     x_scale: 25,
//     y_scale: 10000,
//   }),
// });

// console.log(
//   chart.transfomer,
//   chart.transfomer.world_to_screen([0, 0]),
//   chart.transfomer.screen_to_world([0, 0]),
//   chart.transfomer.screen_to_world([chart.grid.width, chart.grid.height])
// );

// chart.render()[0].ticks.forEach((tick) => {
//   console.log(tick.line);
// });
