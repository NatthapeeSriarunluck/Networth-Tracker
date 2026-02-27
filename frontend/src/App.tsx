import { useState, useEffect } from 'react'
import { 
  Box, Container, Flex, Grid, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select, Button, VStack, HStack, 
  Divider, Spinner, Center, useDisclosure, TableContainer
} from '@chakra-ui/react'
import axios from 'axios'
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { LucideTrendingUp } from 'lucide-react'

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
  const [insightIdx, setInsightIdx] = useState(0)
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
      setInsightIdx(raw.length - 1)
      
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
          <Heading as="h1" fontFamily="Syncopate" letterSpacing="0.4em" color="#d4af37" size="md">AURUM</Heading>
          <Text fontFamily="Space Mono" fontSize="xs" color="#888">System v2.0.26 // FX: {fxRate.toFixed(2)} THB</Text>
        </Flex>

        <Tabs variant="unstyled">
          <TabList gap={10} mb={8} borderBottom="1px solid #1a1a1a">
            <Tab _selected={{ color: "#d4af37", borderBottom: "2px solid #d4af37" }} p={4} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.3em">ARCHITECTURE</Tab>
            <Tab _selected={{ color: "#d4af37", borderBottom: "2px solid #d4af37" }} p={4} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.3em">ANALYSIS & INSIGHTS</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>
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
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr borderBottom="1px solid #1a1a1a">
                        <Th color="#888" p={4} fontFamily="Space Mono">PERIOD</Th>
                        <Th color="#888" p={4} fontFamily="Space Mono">CASH</Th>
                        <Th color="#888" p={4} fontFamily="Space Mono">BITCOIN</Th>
                        <Th color="#888" p={4} fontFamily="Space Mono">U.S PORTFOLIO</Th>
                        <Th color="#888" p={4} fontFamily="Space Mono">NET WORTH</Th>
                        <Th color="#888" p={4} fontFamily="Space Mono">CHANGE</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.slice().reverse().map((row, i) => (
                        <Tr key={i} borderBottom="1px solid #1a1a1a">
                          <Td p={4}>{MONTH_NAMES[row.Month-1].substring(0,3)} {row.Year}</Td>
                          <Td p={4}>฿{row['Cash Reserves'].toLocaleString()}</Td>
                          <Td p={4}>฿{row['Bitcoin'].toLocaleString()}</Td>
                          <Td p={4}>฿{row['U.S Portfolio'].toLocaleString()}</Td>
                          <Td p={4} color="#d4af37">฿{(row.netWorth || 0).toLocaleString()}</Td>
                          <Td p={4} color={(row.delta || 0) >= 0 ? "#00ff88" : "#ff3366"}>
                            {(row.delta || 0) !== 0 ? ((row.delta || 0) > 0 ? '▲' : '▼') + ' ฿' + Math.abs(row.delta || 0).toLocaleString() : '--'}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </TabPanel>

            <TabPanel p={0}>
              <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a" mb={10}>
                <Flex justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <Text fontSize="xs" color="#888" fontFamily="Space Mono" letterSpacing="0.2em">ANALYSIS PERIOD</Text>
                    <Select 
                      variant="filled" bg="#1a1a1a" borderRadius="0" _hover={{ bg: "#222" }}
                      value={insightIdx} onChange={e => setInsightIdx(parseInt(e.target.value))}
                    >
                      {data.map((d, i) => <option key={i} value={i}>{MONTH_NAMES[d.Month-1]} {d.Year} Analysis</option>)}
                    </Select>
                  </VStack>
                  <VStack align="end" gap={1}>
                    <Text fontSize="xs" color="#888" fontFamily="Space Mono">TOTAL PERFORMANCE</Text>
                    <Text fontSize="2xl" fontFamily="Syncopate" color={(data[insightIdx]?.delta || 0) >= 0 ? "#00ff88" : "#ff3366"}>
                      ฿{(data[insightIdx]?.delta || 0).toLocaleString()}
                    </Text>
                  </VStack>
                </Flex>
              </Box>

              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                <CategoryInsight label="CASH" current={data[insightIdx]?.["Cash Reserves"]} previous={data[insightIdx-1]?.["Cash Reserves"]} color="#d4af37" />
                <CategoryInsight label="BITCOIN" current={data[insightIdx]?.["Bitcoin"]} previous={data[insightIdx-1]?.["Bitcoin"]} color="#f7931a" />
                <CategoryInsight label="U.S PORTFOLIO" current={data[insightIdx]?.["U.S Portfolio"]} previous={data[insightIdx-1]?.["U.S Portfolio"]} color="#3498db" />
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>

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
                    bg="#1a1a1a" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
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
                    value={form["Cash Reserves"]} onChange={e => setForm({...form, "Cash Reserves": parseFloat(e.target.value) || 0})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">BITCOIN (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["Bitcoin"]} onChange={e => setForm({...form, "Bitcoin": parseFloat(e.target.value) || 0})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">U.S PORTFOLIO (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["U.S Portfolio"]} onChange={e => setForm({...form, "U.S Portfolio": parseFloat(e.target.value) || 0})}
                  />
                </VStack>
                <VStack align="start" gap={2}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">OBLIGATIONS (THB)</Text>
                  <Input 
                    type="number" bg="transparent" border="1px solid #1a1a1a" borderRadius="0" color="#fff"
                    value={form["Liabilities"]} onChange={e => setForm({...form, "Liabilities": parseFloat(e.target.value) || 0})}
                  />
                </VStack>
              </Grid>

              <Divider mb={10} borderColor="#1a1a1a" />

              <Flex justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <Text fontSize="xs" color="#888" fontFamily="Space Mono">PROJECTED NET WORTH</Text>
                  <Text fontSize="2xl" color="#d4af37" fontFamily="Syncopate">฿{((form["Cash Reserves"] + form["Bitcoin"] + form["U.S Portfolio"]) - form["Liabilities"]).toLocaleString()}</Text>
                </VStack>
                <Button 
                  type="submit" variant="outline" borderColor="#d4af37" color="#d4af37" 
                  borderRadius="0" h="60px" px={10} fontFamily="Syncopate" fontSize="xs" letterSpacing="0.2em"
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

function CategoryInsight({ label, current, previous, color }: { label: string, current: number, previous?: number, color: string }) {
  const diff = current - (previous || 0)
  const isPositive = diff >= 0
  return (
    <Box p={8} bg="#0a0a0a" border="1px solid #1a1a1a" borderLeft={`4px solid ${color}`}>
      <Text fontSize="xs" color="#888" mb={2} fontFamily="Space Mono" letterSpacing="0.2em">{label} PERFORMANCE</Text>
      <Text fontSize="xl" color="#fff" fontFamily="Syncopate">฿{current.toLocaleString()}</Text>
      <Text fontSize="sm" mt={2} fontFamily="Space Mono" color={isPositive ? "#00ff88" : "#ff3366"}>
        {isPositive ? '▲' : '▼'} ฿{Math.abs(diff).toLocaleString()}
      </Text>
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
