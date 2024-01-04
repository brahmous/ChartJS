'use client';
import styles from './page.module.css';
import Chart, { CandleStick, ChartRenderInfo, Transformer } from '../ChartJS';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function () {
  const [data, setChart] = useState<ChartRenderInfo>();
  const [price_data, setData] = useState<CandleStick[]>();

  async function getCandleData() {
    const response = await axios.get('http://localhost:4000');
    const price_data: CandleStick[] = [];
    response.data.price_data.forEach((candle) => {
      price_data.push({
        Close: parseFloat(candle.Close),
        High: parseFloat(candle.High),
        Low: parseFloat(candle.Low),
        Open: parseFloat(candle.Open),
        UTC: candle.UTC,
      });
    });
    setData(price_data);
  }

  useEffect(() => {
    getCandleData();
  }, []);

  useEffect(() => {
    if (price_data) {
      const chart = new Chart({
        canvas_width: window.innerWidth,
        canvas_height: window.innerHeight,
        xaxis_height: 50,
        yaxis_width: 100,
        transformer: new Transformer({
          x_offset: 0,
          y_offset: 0,
          x_scale: 100,
          y_scale: 100000,
          x_tick_size: 1,
          y_tick_size: 0.001,
        }),
        price_data: price_data,
      });
      chart.transfomer.set_offset(
        [499, price_data[499].Open],
        [window.innerHeight, window.innerHeight / 2]
      );
      setChart(chart.render());
    }
  }, [price_data]);

  return (
    <div className={styles.main}>
      <svg
        className={styles.canvas}
        xmlns="http://www.w3.org/2000/svg"
        // onMouseDown={handle_mousedown}
        // onMouseUp={handle_mouseup}
        // onMouseMove={handle_pan}
        // onWheel={handle_zoom}
      >
        {data && (
          <>
            {/* X-Axis */}
            <line
              x1={data[0].line[0][0]}
              y1={data[0].line[0][1]}
              x2={data[0].line[1][0]}
              y2={data[0].line[1][1]}
              stroke="black"
              strokeWidth={0.5}
            />
            {/* X-Axis ticks */}

            <g>
              {data[0].ticks.map((tick, key) => {
                return (
                  <line
                    key={key}
                    x1={tick.line[0][0]}
                    y1={tick.line[0][1]}
                    x2={tick.line[1][0]}
                    y2={tick.line[1][1]}
                    stroke="black"
                    strokeWidth={0.1}
                  />
                );
              })}
            </g>
            {/* Y-Axis */}
            <line
              x1={data[1].line[0][0]}
              y1={data[1].line[0][1]}
              x2={data[1].line[1][0]}
              y2={data[1].line[1][1]}
              stroke="black"
              strokeWidth={0.5}
            />
            {/* Y-Axis ticks */}
            <g>
              {data[1].ticks.map((tick, key) => {
                return (
                  <line
                    key={key}
                    x1={tick.line[0][0]}
                    y1={tick.line[0][1]}
                    x2={tick.line[1][0]}
                    y2={tick.line[1][1]}
                    stroke="black"
                    strokeWidth={0.1}
                  />
                );
              })}
            </g>
            {data[2].map((candle, key) => {
              return (
                <g key={key}>
                  <line
                    x1={candle.tail[0][0]}
                    y1={candle.tail[0][1]}
                    x2={candle.tail[1][0]}
                    y2={candle.tail[1][1]}
                    stroke={candle.main.up ? 'green' : 'red'}
                    strokeWidth={0.5}
                  />
                  <rect
                    x={candle.main.position[0]}
                    y={candle.main.position[1]}
                    width={candle.main.width}
                    height={candle.main.height}
                    fill={candle.main.up ? 'green' : 'red'}
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
