import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { ChartRow } from "@/api/types/price";
import { CHART_COLORS } from "@/lib/colors";

interface CandlestickChartProps {
  data: ChartRow[];
  overlays?: {
    sma10?: boolean;
    sma20?: boolean;
    sma50?: boolean;
    sma200?: boolean;
    ema12?: boolean;
    ema50?: boolean;
    bb?: boolean;
  };
  height?: number;
}

export function CandlestickChart({
  data,
  overlays = {},
  height = 500,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [legendData, setLegendData] = useState<{
    date?: string;
    o?: number;
    h?: number;
    l?: number;
    c?: number;
    v?: number;
  }>({});

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Sort ascending for lightweight-charts
    const sorted = [...data]
      .filter((d) => d.close != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      timeScale: { borderColor: CHART_COLORS.grid },
    });
    chartRef.current = chart;

    // Candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.candle_up,
      downColor: CHART_COLORS.candle_down,
      borderUpColor: CHART_COLORS.candle_up,
      borderDownColor: CHART_COLORS.candle_down,
      wickUpColor: CHART_COLORS.candle_up,
      wickDownColor: CHART_COLORS.candle_down,
    });

    candleSeries.setData(
      sorted.map((d) => ({
        time: d.date,
        open: d.open ?? d.close!,
        high: d.high ?? d.close!,
        low: d.low ?? d.close!,
        close: d.close!,
      }))
    );

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(
      sorted.map((d) => ({
        time: d.date,
        value: d.volume ?? 0,
        color:
          (d.close ?? 0) >= (d.open ?? 0)
            ? CHART_COLORS.volume_up
            : CHART_COLORS.volume_down,
      }))
    );

    // Overlay line series helper
    const addOverlay = (
      key: keyof ChartRow,
      color: string,
      lineWidth: 1 | 2 | 3 | 4 = 1
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        sorted
          .filter((d) => d[key] != null)
          .map((d) => ({ time: d.date, value: d[key] as number }))
      );
      return series;
    };

    if (overlays.sma10) addOverlay("sma_10", CHART_COLORS.sma10);
    if (overlays.sma20) addOverlay("sma_20", CHART_COLORS.sma20);
    if (overlays.sma50) addOverlay("sma_50", CHART_COLORS.sma50, 2);
    if (overlays.sma200) addOverlay("sma_200", CHART_COLORS.sma200, 2);
    if (overlays.ema12) addOverlay("ema_12", CHART_COLORS.ema12);
    if (overlays.ema50) addOverlay("ema_50", CHART_COLORS.ema50);
    if (overlays.bb) {
      addOverlay("bb_upper", CHART_COLORS.bbUpper);
      addOverlay("bb_lower", CHART_COLORS.bbLower);
      addOverlay("bb_middle", CHART_COLORS.bbMiddle);
    }

    // Crosshair move handler for legend
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setLegendData({});
        return;
      }
      const candle = param.seriesData.get(candleSeries) as any;
      const vol = param.seriesData.get(volumeSeries) as any;
      if (candle) {
        setLegendData({
          date: param.time as string,
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close,
          v: vol?.value,
        });
      }
    });

    chart.timeScale().fitContent();

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, overlays, height]);

  return (
    <div className="relative">
      {/* Floating legend */}
      {legendData.date && (
        <div className="absolute left-2 top-2 z-10 flex gap-3 rounded bg-bg-secondary/90 px-2 py-1 text-xs">
          <span className="text-text-muted">{legendData.date}</span>
          <span>
            O <span className="text-text-primary">{legendData.o?.toFixed(2)}</span>
          </span>
          <span>
            H <span className="text-text-primary">{legendData.h?.toFixed(2)}</span>
          </span>
          <span>
            L <span className="text-text-primary">{legendData.l?.toFixed(2)}</span>
          </span>
          <span>
            C <span className="text-text-primary">{legendData.c?.toFixed(2)}</span>
          </span>
          {legendData.v != null && (
            <span>
              V{" "}
              <span className="text-text-primary">
                {legendData.v >= 1e6
                  ? `${(legendData.v / 1e6).toFixed(1)}M`
                  : legendData.v.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      )}
      <div ref={containerRef} role="img" aria-label="Candlestick price chart with volume" />
    </div>
  );
}
