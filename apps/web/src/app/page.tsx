"use client"

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
  FiTrendingDown,
  FiSettings,
  FiBell,
  FiSearch,
  FiChevronRight,
  FiGrid,
  FiClock,
  FiDownload,
} from "react-icons/fi"
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

const chartConfig = {
  cash: {
    label: "Cash",
    color: "hsl(var(--chart-2))",
  },
  bitcoin: {
    label: "Bitcoin",
    color: "hsl(var(--chart-5))",
  },
  portfolio: {
    label: "U.S Equities",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const [data, setData] = useState<NetWorthEntry[]>([])
  const [fxRate, setFxRate] = useState(31.41)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    Year: new Date().getFullYear(),
    Month: new Date().getMonth() + 1,
    Cash_Reserves: 0,
    Bitcoin: 0,
    US_Portfolio: 0,
    Liabilities: 0
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

  const handleSaveEntry = async () => {
    try {
      // Map names to match backend Pydantic alias if needed
      const payload = {
        Year: formData.Year,
        Month: formData.Month,
        "Cash Reserves": formData.Cash_Reserves,
        Bitcoin: formData.Bitcoin,
        "U.S Portfolio": formData.US_Portfolio,
        Liabilities: formData.Liabilities
      }
      
      await axios.post('/api/save', payload)
      setIsDialogOpen(false)
      fetchData() // Refresh
    } catch (err) {
      console.error("Save failed", err)
      alert("Failed to save entry. Check backend logs.")
    }
  }

  const latest = data[data.length - 1] || {} as NetWorthEntry
  const netWorth = latest.netWorth || 0
  const previousNetWorth = data.length > 1 ? data[data.length - 2].netWorth || 0 : 0
  const monthlyChange = netWorth - previousNetWorth
  const monthlyChangePercent = previousNetWorth !== 0 ? (monthlyChange / previousNetWorth) * 100 : 0

  const chartData = data.slice(-12).map(d => ({
    name: `${MONTH_NAMES[d.Month-1].substring(0,3)} ${d.Year}`,
    total: d.netWorth,
    assets: (d["Cash Reserves"] || 0) + (d["Bitcoin"] || 0) + (d["U.S Portfolio"] || 0),
  }))

  const pieData = [
    { asset: "cash", value: latest["Cash Reserves"] || 0, fill: "var(--color-chart-2)" },
    { asset: "bitcoin", value: latest["Bitcoin"] || 0, fill: "var(--color-chart-5)" },
    { asset: "portfolio", value: latest["U.S Portfolio"] || 0, fill: "var(--color-chart-1)" },
  ]

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-1 bg-muted overflow-hidden relative rounded-full">
            <div className="absolute inset-0 bg-primary w-1/3 animate-loading-bar"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Synchronizing Vault</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background selection:bg-primary/10">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="h-16 flex items-center px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FiLayers className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-semibold tracking-tight">AURUM</span>
                <span className="truncate text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Architecture</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Dashboard" isActive>
                      <FiGrid />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Analytics">
                      <FiPieChart />
                      <span>Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Ledger">
                      <FiClock />
                      <span>Vault Ledger</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel>Optimization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Strategy">
                      <FiActivity />
                      <span>Tactical Logic</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <FiSettings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
             <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border">
                <AvatarFallback>NS</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-semibold">Architect</span>
                <span className="truncate text-[10px] text-muted-foreground font-mono">CTH5260419</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 bg-background/50">
          <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:flex items-center">
                <FiSearch className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search assets..." 
                  className="w-64 pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
                />
              </div>
              <Badge variant="outline" className="font-mono text-[10px] h-8 px-3 rounded-md bg-muted/50 border-none">
                {fxRate.toFixed(2)} THB/USD
              </Badge>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                <FiBell className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Net Worth Overview</h1>
                <p className="text-muted-foreground">Monitor and analyze your asset trajectory.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <FiDownload className="h-4 w-4" /> Export
                </Button>
                
                {/* RECORD POSITION DIALOG */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 gap-2">
                      <FiPlus className="h-4 w-4" /> Record Position
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Record Position</DialogTitle>
                      <DialogDescription>
                        Update your vault with the latest financial snapshot.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Input 
                            type="number" 
                            value={formData.Year} 
                            onChange={(e) => setFormData({...formData, Year: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Month</Label>
                          <Select 
                            value={formData.Month.toString()} 
                            onValueChange={(val) => setFormData({...formData, Month: parseInt(val)})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTH_NAMES.map((name, i) => (
                                <SelectItem key={i} value={(i + 1).toString()}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Cash Reserves (THB)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={formData.Cash_Reserves || ""} 
                          onChange={(e) => setFormData({...formData, Cash_Reserves: parseFloat(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Bitcoin (THB equivalent)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={formData.Bitcoin || ""} 
                          onChange={(e) => setFormData({...formData, Bitcoin: parseFloat(e.target.value)})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>U.S Portfolio (THB equivalent)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={formData.US_Portfolio || ""} 
                          onChange={(e) => setFormData({...formData, US_Portfolio: parseFloat(e.target.value)})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Liabilities (THB)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={formData.Liabilities || ""} 
                          onChange={(e) => setFormData({...formData, Liabilities: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveEntry}>Save Position</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                title="Total Net Worth" 
                value={netWorth} 
                change={monthlyChange} 
                percent={monthlyChangePercent}
                icon={FiLayers}
              />
              <StatCard 
                title="Cash Reserves" 
                value={latest["Cash Reserves"] || 0} 
                icon={FiDollarSign}
                subtitle="Available Liquidity"
              />
              <StatCard 
                title="Crypto Assets" 
                value={latest["Bitcoin"] || 0} 
                icon={FiLock}
                subtitle="Digital Exposure"
              />
              <StatCard 
                title="Equity Portfolio" 
                value={latest["U.S Portfolio"] || 0} 
                icon={FiBriefcase}
                subtitle="Stock Market"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 shadow-sm">
                <CardHeader>
                  <CardTitle>Growth Trajectory</CardTitle>
                  <CardDescription>Historical performance over the last 12 months.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `฿${(value / 1000000).toFixed(1)}M`}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>Portfolio distribution by sector</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[300px] [&_.recharts-pie-label-text]:fill-foreground"
                  >
                    <PieChart>
                      <ShadcnChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie 
                        data={pieData} 
                        dataKey="value" 
                        label 
                        nameKey="asset" 
                        innerRadius={60}
                        strokeWidth={5}
                        stroke="hsl(var(--background))"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm border-t p-6">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    {monthlyChange >= 0 ? "Trending up" : "Trending down"} by {Math.abs(monthlyChangePercent).toFixed(1)}% this month 
                    {monthlyChange >= 0 ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="leading-none text-muted-foreground">
                    Aggregated across all asset classes
                  </div>
                </CardFooter>
              </Card>
            </div>

            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Historical Ledger</CardTitle>
                  <CardDescription>Comprehensive record of all vault entries.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                  View All <FiChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Period</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Bitcoin</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead className="text-right pr-6">Net Worth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice().reverse().map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium pl-6">
                        {MONTH_NAMES[row.Month-1]} {row.Year}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">฿{row['Cash Reserves'].toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">฿{row['Bitcoin'].toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">฿{row['U.S Portfolio'].toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                         <div className="flex flex-col items-end gap-1">
                            <span className="font-bold tabular-nums">
                              ฿{(row.netWorth || 0).toLocaleString()}
                            </span>
                            <span className={`text-[10px] font-medium ${(row.delta || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {(row.delta || 0) >= 0 ? "+" : "-"}{Math.abs(row.delta || 0).toLocaleString()}
                            </span>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function StatCard({ title, value, change, percent, subtitle, icon: Icon }: any) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">฿{value.toLocaleString()}</div>
        {change !== undefined ? (
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-medium flex items-center gap-1 ${change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {change >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
              {percent.toFixed(1)}% 
            </span>
            <span className="text-[10px] text-muted-foreground">vs last month</span>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
