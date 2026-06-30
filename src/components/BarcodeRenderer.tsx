'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  darkTheme?: boolean;
}

export function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 50,
  displayValue = true,
  darkTheme = true,
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          background: 'transparent',
          lineColor: darkTheme ? '#f1f5f9' : '#0f172a', // slate-100 or slate-900 lines
          fontOptions: 'bold',
          fontSize: 12,
        });
      } catch (err) {
        console.error('Failed to render barcode:', err);
      }
    }
  }, [value, format, width, height, displayValue, darkTheme]);

  return <svg ref={svgRef} className="mx-auto max-w-full" />;
}
