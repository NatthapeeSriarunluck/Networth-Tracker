import { useState, useEffect } from "react"
import axios from "axios"
import {
  FiActivity,
  FiLayers,
  FiDollarSign,
  FiBriefcase,
  FiLock,
  FiPlus,
  FiPieChart,
  FiTrendingUp,
  FiSettings,
  FiDatabase,
  FiLayout,
  FiBell,
  FiSearch,
  FiChevronRight,
  FiMoreHorizontal,
} from "react-icons/fi"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts"

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInset,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TooltipProvider } from "@/components/ui/tooltip"

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", 
               "July", "August", "September", "October", "November", "December"]

interface NetWorthEntry {
  id?: number;
  Year: number;
  Month: number;
  "Cash Reserves": number;
  "Bitcoin": number;
  "U.S Portfolio": number;
  "Liabilities": number;
  netWorth?: number;
  delta?: number;
}

export default function App() {
  const [data, setData] = useState<NetWorthEntry[]>([])
  const [fxRate, setFxRate] = useState(35.0)
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState(10000000)
  const [form, setForm] = useState<NetWorthEntry>({
    Year: new Date().getFullYear(),
    Month: new Date().getMonth() + 1,
    "Cash Reserves": 0,
    "Bitcoin": 0,
    "U.S Portfolio": 0,
    "Liabilities": 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [dataRes, rateRes] = await Promise.all([
        axios.get('/api/data'),
        axios.get('/api/rate')
      ])
      
      const raw = dataRes.data as NetWorthEntry[]
      raw.sort((a, b) => (a.Year - b.Year) || (a.Month - b.Month))
      
      raw.forEach((row, i) => {
        const assets = (row['Cash Reserves'] || 0) + (row['Bitcoin'] || 0) + (row['U.S Portfolio'] || 0)
        row.netWorth = assets - (row['Liabilities'] || 0)
        row.delta = i > 0 ? (row.netWorth - (raw[i-1].netWorth || 0)) : 0
      })
      
      setData(raw)
      setFxRate(rateRes.data.rate)
    } catch (err) {
      console.error("Fetch failed", err)
    } finally {
      setLoading(false)
    }
  }

  const latest = data[data.length - 1] || {} as NetWorthEntry
  const netWorth = latest.netWorth || 0
  const previousNetWorth = data.length > 1 ? data[data.length - 2].netWorth || 0 : 0
  const monthlyChange = netWorth - previousNetWorth
  const monthlyChangePercent = previousNetWorth !== 0 ? (monthlyChange / previousNetWorth) * 100 : 0

  // Prepare chart data
  const chartData = data.map(d => ({
    name: `${MONTH_NAMES[d.Month-1].substring(0,3)} ${d.Year}`,
    total: d.netWorth,
  }))

  const allocationData = [
    { name: "Cash", value: latest["Cash Reserves"] || 0, color: "var(--color-accent-gold)" },
    { name: "Bitcoin", value: latest["Bitcoin"] || 0, color: "#f7931a" },
    { name: "Portfolio", value: latest["U.S Portfolio"] || 0, color: "#3b82f6" },
  ]

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-display text-sm tracking-widest uppercase">Initializing Vault</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background font-sans selection:bg-primary/20">
          {/* Main Sidebar */}
          <Sidebar collapsible="icon" className="border-r border-border bg-card">
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  A
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-display text-sm font-bold tracking-tight">AURUM</span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-widest">Architecture</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2 pt-4">
              <SidebarGroup>
                <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-widest font-semibold opacity-50">Overview</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Dashboard" isActive>
                        <FiLayout className="h-4 w-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Analytics">
                        <FiPieChart className="h-4 w-4" />
                        <span>Analytics</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Transactions">
                        <FiDatabase className="h-4 w-4" />
                        <span>Ledger</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-widest font-semibold opacity-50">Strategy</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Allocation">
                        <FiLayers className="h-4 w-4" />
                        <span>Rebalance</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Settings">
                        <FiSettings className="h-4 w-4" />
                        <span>Configuration</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4">
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="rounded-lg">NS</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-xs font-semibold">Architect</span>
                  <span className="truncate text-[10px] text-muted-foreground">Admin Access</span>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-background">
            {/* Top Navigation Bar */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-20">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#" className="text-xs uppercase tracking-widest font-semibold opacity-50">System</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-xs uppercase tracking-widest font-semibold">Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search assets..." 
                    className="w-64 bg-muted/50 pl-9 rounded-full border-none h-9 text-xs focus-visible:ring-primary/20"
                  />
                </div>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                  <FiBell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-background"></span>
                </Button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[9px] px-2 py-0 h-6 bg-primary/10 text-primary border-none">
                    FX: {fxRate.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </header>

            {/* Scrollable Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {/* Hero Stats */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight">Main Vault</h2>
                  <p className="text-muted-foreground text-sm mt-1">Real-time architectural overview of your net worth position.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg gap-2">
                    <FiDatabase className="w-3.5 h-3.5" /> Export Data
                  </Button>
                  <Button className="h-9 text-xs font-semibold rounded-lg gap-2 bg-primary hover:bg-primary/90">
                    <FiPlus className="w-3.5 h-3.5" /> Record Position
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Aggregated Equity</CardTitle>
                    <FiLayers className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers tabular-nums">฿{netWorth.toLocaleString()}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${monthlyChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {monthlyChange >= 0 ? "+" : ""}{monthlyChangePercent.toFixed(1)}% 
                        {monthlyChange >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      </span>
                      <span className="text-[10px] text-muted-foreground">from last month</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Cash Reserves</CardTitle>
                    <FiDollarSign className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers tabular-nums">฿{(latest["Cash Reserves"] || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">Liquidity Profile: High</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Crypto Assets</CardTitle>
                    <FiLock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers tabular-nums">฿{(latest["Bitcoin"] || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">Active Exposure: High-Growth</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Equity Portfolio</CardTitle>
                    <FiBriefcase className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers tabular-nums">฿{(latest["U.S Portfolio"] || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">Market Beta: 1.05</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Equity Growth</CardTitle>
                      <CardDescription className="text-xs">Aggregate value over the last 12 months</CardDescription>
                    </div>
                    <div className="flex gap-2">
                       <Badge variant="outline" className="h-7 rounded-md font-mono text-[9px]">1Y</Badge>
                       <Badge variant="secondary" className="h-7 rounded-md font-mono text-[9px] bg-primary/10">ALL</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2">
                    <div className="h-[350px] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-accent-gold)" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="var(--color-accent-gold)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#ffffff08" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => value}
                            dy={10}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `฿${value / 1000000}M`}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontFamily: "Space Mono"
                            }}
                            cursor={{ stroke: "var(--color-accent-gold)", strokeWidth: 1, strokeDasharray: "4 4" }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="total" 
                            stroke="var(--color-accent-gold)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorTotal)" 
                            animationDuration={2000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Structure</CardTitle>
                    <CardDescription className="text-xs">Asset class distribution and weight</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocationData} layout="vertical">
                           <XAxis type="number" hide />
                           <YAxis 
                             dataKey="name" 
                             type="category" 
                             tickLine={false} 
                             axisLine={false} 
                             fontSize={10} 
                             stroke="#888"
                             width={70}
                           />
                           <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                             {allocationData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 mt-6">
                      {allocationData.map((asset) => (
                        <div key={asset.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                            <span className="text-xs font-semibold uppercase tracking-wider">{asset.name}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-bold font-numbers">฿{asset.value.toLocaleString()}</div>
                             <div className="text-[9px] text-muted-foreground font-mono">
                               {((asset.value / totalAssets) * 100).toFixed(1)}% Weight
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Ledger Table */}
              <div className="space-y-4 pb-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-display font-bold">Historical Ledger</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Immutable Chain of Custody</p>
                  </div>
                  <Select defaultValue="desc">
                    <SelectTrigger className="w-[180px] h-9 text-xs font-semibold rounded-lg bg-card/50">
                      <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-6">Period</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cash Reserves</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Crypto</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equities</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-primary text-right">Net Worth</TableHead>
                        <TableHead className="text-right pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.slice().reverse().map((row, i) => (
                        <TableRow key={i} className="hover:bg-white/[0.03] border-border/30 group transition-colors">
                          <TableCell className="py-5 font-semibold pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                              <span>{MONTH_NAMES[row.Month-1]} {row.Year}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-numbers text-muted-foreground text-xs">฿{row['Cash Reserves'].toLocaleString()}</TableCell>
                          <TableCell className="font-numbers text-muted-foreground text-xs">฿{row['Bitcoin'].toLocaleString()}</TableCell>
                          <TableCell className="font-numbers text-muted-foreground text-xs">฿{row['U.S Portfolio'].toLocaleString()}</TableCell>
                          <TableCell className="text-right font-numbers font-bold text-sm">
                            ฿{(row.netWorth || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                             <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                               <FiMoreHorizontal className="h-4 w-4" />
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
