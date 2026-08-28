"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";

// Monochrome chart palette — one light series per chart, dark grid + tooltip to match the surface.
const INK = "#e0e0e0";
const AXIS = "#8a8a8f";
const GRID = "#242427";
const TOOLTIP = { background: "#141414", border: "1px solid #242427", borderRadius: "8px", color: "#f5f5f5" } as const;
const emptyCls = "flex h-full items-center justify-center text-muted-foreground text-sm py-10";

export function RevenueChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className={emptyCls}>No lead source data</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
        <Bar dataKey="total" fill={INK} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsBySourceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className={emptyCls}>No lead source data</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
        <Bar dataKey="count" fill={INK} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsByStageChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className={emptyCls}>No pipeline stage data</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={INK} stopOpacity={0.25} />
            <stop offset="95%" stopColor={INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP} />
        <Area type="monotone" dataKey="count" stroke={INK} fillOpacity={1} fill="url(#colorCount)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LeadsByOwnerChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className={emptyCls}>No owner allocation data</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" stroke={AXIS} fontSize={12} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={12} axisLine={false} tickLine={false} width={100} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
        <Bar dataKey="count" fill={INK} radius={[0, 6, 6, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
