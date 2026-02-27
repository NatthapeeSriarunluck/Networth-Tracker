import { useState, useEffect } from 'react'
import { 
  Box, Container, Flex, Grid, Heading, Text, Tabs, 
  Table, Input, Select, Button, VStack, HStack, 
  Separator, Spinner, Center, useDisclosure 
} from '@chakra-ui/react'
import axios from 'axios'
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { format } from 'date-fns'
import { LucideTrendingUp, LucideTrendingDown, LucideCoins, LucideLock, LucideBuilding } from 'lucide-react'

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, ArcElement, Filler
)

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
  const [form, setForm] = useState<NetWorthEntry>({
    Year: 2026,
    Month: 3,
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
      
      // Calculate Deltas
      raw.forEach((row, i) => {
        const assets = (row['Cash Reserves'] || 0) + (row['Bitcoin'] || 0) + (row['U.S Portfolio'] || 0)
        row.netWorth = assets - (row['Liabilities'] || 0)
        row.delta = i > 0 ? (row.netWorth - (raw[i-1].netWorth || 0)) : 0
      })
      
      setData(raw)
      setFxRate(rateRes.data.rate)
      
      // Auto-sync form if current month exists
      const latest = raw[raw.length - 1]
      if (latest) {
        setForm({
          Year: latest.Year,
          Month: latest.Month,
          "Cash Reserves": latest["Cash Reserves"],
          "Bitcoin": latest["Bitcoin"],
          "U.S Portfolio": latest["U.S Portfolio"],
          "Liabilities": latest["Liabilities"]
        })
      }
    } catch (err) {
      console.error("Fetch failed", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/save', form)
      fetchData()
    } catch (err) {
      console.error("Save failed", err)
    }
  }

  const syncForm = (year: number, month: number) => {
    const existing = data.find(d => d.Year === year && d.Month === month)
    if (existing) {
      setForm({ ...existing })
    } else {
      setForm({ Year: year, Month: month, "Cash Reserves": 0, "Bitcoin": 0, "U.S Portfolio": 0, "Liabilities": 0 })
    }
  }

  if (loading && data.length === 0) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="#d4af37" />
        <Text ml={4} fontFamily="Syncopate" letterSpacing="0.4em" color="#d4af37">LOADING</Text>
      </Center>
    )
  }

  const latest = data[data.length - 1] || {} as NetWorthEntry
  const totalAssets = (latest['Cash Reserves'] || 0) + (latest['Bitcoin'] || 0) + (latest['U.S Portfolio'] || 0)
  const netWorth = (latest.netWorth || 0)

  // Chart Configs
  const lineData = {
    labels: data.map(d => `${MONTH_NAMES[d.Month-1].substring(0,3)} ${d.Year}`),
    datasets: [{
      label: 'Net Worth',
      data: data.map(d => d.netWorth || 0),
      borderColor: '#d4af37',
      backgroundColor: 'rgba(212, 175, 55, 0.05)',
      fill: true,
      tension: 0.4
    }]
  }

  const doughnutData = {
    labels: ['Cash', 'Bitcoin', 'U.S Portfolio'],
    datasets: [{
      data: [latest['Cash Reserves'] || 0, latest['Bitcoin'] || 0, latest['U.S Portfolio'] || 0],
      backgroundColor: ['#d4af37', '#f7931a', '#3498db'],
      borderColor: '#050505',
      borderWidth: 2
    }]
  }

  return (
    <Box minH="100vh" bg="#050505" color="#e0e0e0" pb={20}>
      <Container maxW="1400px" pt={10}>
        <Flex justify="space-between" align="flex-end" borderBottom="1px solid #d4af37" pb={5} mb={10}>
          <Heading as="h1" fontFamily="Syncopate" letterSpacing="0.4em" color="#d4af37" size="lg">AURUM</Heading>
          <Text fontFamily="Space Mono" fontSize="xs" color="#888">System v2.0.26 // FX: {fxRate.toFixed(2)} THB</Text>
        </Flex>

        <Tabs.Root defaultValue="architecture" variant="plain">
          <Tabs.List gap={10} mb={8} borderBottom="1px solid #1a1a1a">
            <Tabs.Trigger value="architecture" p={4} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.3em">ARCHITECTURE</Tabs.Trigger>
            <Tabs.Trigger value="insights" p={4} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.3em">ANALYSIS & INSIGHTS</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="architecture">
            <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={6} mb={10}>
              <MetricCard label="AGGREGATED EQUITY" value={netWorth} delta={latest.delta} symbol="฿" />
              <MetricCard label="GROSS EXPOSURE" value={totalAssets} symbol="฿" />
              <MetricCard label="TOTAL OBLIGATIONS" value={latest['Liabilities'] || 0} symbol="฿" />
            </Grid>

            <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} mb={10}>
              <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a">
                <Text fontSize="xs" color="#888" mb={5} fontFamily="Space Mono" letterSpacing="0.2em">PROJECTION GROWTH CURVE</Text>
                <Box h="400px"><Line data={lineData} options={chartOptions} /></Box>
              </Box>
              <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a">
                <Text fontSize="xs" color="#888" mb={5} fontFamily="Space Mono" letterSpacing="0.2em">ALLOCATION STRUCTURE</Text>
                <Box h="400px"><Doughnut data={doughnutData} options={doughnutOptions} /></Box>
              </Box>
            </Grid>

            <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a">
              <Text fontSize="xs" color="#888" mb={5} fontFamily="Space Mono" letterSpacing="0.2em">HISTORICAL LEDGER</Text>
              <Box overflowX="auto">
                <Table.Root size="sm" variant="simple">
                  <Table.Header>
                    <Table.Row borderBottom="1px solid #1a1a1a">
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">PERIOD</Table.ColumnHeader>
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">CASH</Table.ColumnHeader>
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">BITCOIN</Table.ColumnHeader>
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">U.S PORTFOLIO</Table.ColumnHeader>
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">NET WORTH</Table.ColumnHeader>
                      <Table.ColumnHeader color="#888" p={4} fontFamily="Space Mono">CHANGE</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {data.slice().reverse().map((row, i) => (
                      <Table.Row key={i} borderBottom="1px solid #1a1a1a">
                        <Table.Cell p={4}>{MONTH_NAMES[row.Month-1].substring(0,3)} {row.Year}</Table.Cell>
                        <Table.Cell p={4}>฿{row['Cash Reserves'].toLocaleString()}</Table.Cell>
                        <Table.Cell p={4}>฿{row['Bitcoin'].toLocaleString()}</Table.Cell>
                        <Table.Cell p={4}>฿{row['U.S Portfolio'].toLocaleString()}</Table.Cell>
                        <Table.Cell p={4} color="#d4af37">฿{(row.netWorth || 0).toLocaleString()}</Table.Cell>
                        <Table.Cell p={4} color={(row.delta || 0) >= 0 ? "#00ff88" : "#ff3366"}>
                          {(row.delta || 0) !== 0 ? ((row.delta || 0) > 0 ? '▲' : '▼') + ' ฿' + Math.abs(row.delta || 0).toLocaleString() : '--'}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="insights">
            <Center py={20}>
              <VStack gap={4}>
                <LucideTrendingUp size={48} color="#d4af37" />
                <Text fontFamily="Syncopate" letterSpacing="0.4em" fontSize="xl">DEEP INSIGHTS ENGINE</Text>
                <Text color="#888" fontFamily="Space Mono">ANALYSIS MODULE READY FOR PROCESSING</Text>
              </VStack>
            </Center>
          </Tabs.Content>
        </Tabs.Root>

        {/* Input Form Section */}
        <Box mt={20} borderTop="1px solid #1a1a1a" pt={20}>
          <Box p={10} bg="#0a0a0a" border="1px solid #1a1a1a" position="relative">
            <Box position="absolute" top={0} right={0} w="5px" h="5px" bg="#d4af37" />
            <Text fontSize="xs" color="#888" mb={8} fontFamily="Space Mono" letterSpacing="0.2em">ARCHITECT INPUT</Text>
            
            <form onSubmit={handleSave}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8} mb={10}>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">YEAR</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form.Year} onChange={e => {
                      const v = parseInt(e.target.value); 
                      setForm({...form, Year: v}); 
                      syncForm(v, form.Month);
                    }} 
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">MONTH</Text>
                  <Select 
                    bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form.Month} onChange={e => {
                      const v = parseInt(e.target.value); 
                      setForm({...form, Month: v}); 
                      syncForm(form.Year, v);
                    }}
                  >
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </Select>
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">CASH RESERVES (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["Cash Reserves"]} onChange={e => setForm({...form, "Cash Reserves": parseFloat(e.target.value)})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">BITCOIN (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["Bitcoin"]} onChange={e => setForm({...form, "Bitcoin": parseFloat(e.target.value)})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">U.S PORTFOLIO (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["U.S Portfolio"]} onChange={e => setForm({...form, "U.S Portfolio": parseFloat(e.target.value)})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">OBLIGATIONS (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["Liabilities"]} onChange={e => setForm({...form, "Liabilities": parseFloat(e.target.value)})}
                  />
                </VStack>
              </Grid>

              <Separator mb={10} borderColor="#1a1a1a" />

              <Flex justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">PROJECTED NET WORTH</Text>
                  <Text fontSize="2xl" color="#d4af37" fontFamily="Syncopate">฿{((form["Cash Reserves"] + form["Bitcoin"] + form["U.S Portfolio"]) - form["Liabilities"]).toLocaleString()}</Text>
                </VStack>
                <Button 
                  type="submit" variant="outline" borderColor="#d4af37" color="#d4af37" 
                  borderRadius="0" p={8} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.2em"
                  _hover={{ bg: "#d4af37", color: "#000" }}
                >
                  RECORD POSITION
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

function MetricCard({ label, value, delta, symbol }: { label: string, value: number, delta?: number, symbol: string }) {
  const isPositive = (delta || 0) >= 0
  return (
    <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a" position="relative">
      <Box position="absolute" top={0} right={0} w="5px" h="5px" bg="#d4af37" />
      <Text fontSize="xs" color="#888" mb={5} fontFamily="Space Mono" letterSpacing="0.2em">{label}</Text>
      <Text fontSize="3xl" color="#fff" fontFamily="Syncopate">{symbol}{value.toLocaleString()}</Text>
      {delta !== undefined && (
        <Text fontSize="xs" mt={2} fontFamily="Space Mono" color={isPositive ? "#00ff88" : "#ff3366"}>
          {isPositive ? '+' : ''}{delta.toLocaleString()}
        </Text>
      )}
    </Box>
  )
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#555', font: { family: 'Space Mono' } } },
    y: { grid: { color: '#1a1a1a' }, ticks: { color: '#555', font: { family: 'Space Mono' } } }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: { 
    legend: { 
      position: 'bottom' as const,
      labels: { color: '#888', font: { family: 'Space Mono', size: 10 }, usePointStyle: true, pointStyle: 'rect' }
    } 
  }
}
