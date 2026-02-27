import { useState, useEffect } from 'react'
import { 
  Box, Container, Flex, Grid, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select, Button, VStack, HStack, 
  Divider, Spinner, Center, useDisclosure, TableContainer, Icon, Badge,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, StatGroup, Progress
} from '@chakra-ui/react'
import axios from 'axios'
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, ArcElement, Filler, BarElement
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { FiTrendingUp, FiTrendingDown, FiActivity, FiLayers, FiDollarSign, FiBriefcase, FiLock, FiPlus } from 'react-icons/fi'

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
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

// Custom Theme Colors
const colors = {
  bgBase: '#000000',
  bgCard: '#0f0f0f',
  bgCardHover: '#141414',
  border: '#222222',
  textMain: '#f0f0f0',
  textMuted: '#888888',
  accentPrimary: '#d4af37', // Gold
  accentSecondary: '#f7931a', // BTC Orange
  accentTertiary: '#3498db', // Portfolio Blue
  success: '#00ff88',
  danger: '#ff3366',
}

export default function App() {
  const [data, setData] = useState<NetWorthEntry[]>([])
  const [fxRate, setFxRate] = useState(35.0)
  const [loading, setLoading] = useState(true)
  const [insightIdx, setInsightIdx] = useState(0)
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem('aurum_goal')
    return saved ? parseFloat(saved) : 1000000
  })
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

  useEffect(() => {
    localStorage.setItem('aurum_goal', goal.toString())
  }, [goal])

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
      setInsightIdx(raw.length - 1 > 0 ? raw.length - 1 : 0)
      
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
      <Center h="100vh" bg={colors.bgBase}>
        <VStack spacing={6}>
          <Spinner size="xl" thickness="3px" speed="0.65s" emptyColor="gray.800" color={colors.accentPrimary} />
          <Text fontFamily="Syncopate" letterSpacing="0.5em" color={colors.accentPrimary} fontSize="sm">INITIALIZING SYSTEM</Text>
        </VStack>
      </Center>
    )
  }

  const latest = data[data.length - 1] || {} as NetWorthEntry
  const totalAssets = (latest['Cash Reserves'] || 0) + (latest['Bitcoin'] || 0) + (latest['U.S Portfolio'] || 0)
  const netWorth = (latest.netWorth || 0)
  const previousNetWorth = data.length > 1 ? data[data.length - 2].netWorth || 0 : 0;
  const growthPercentage = previousNetWorth > 0 ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 : 0;

  // Dynamic Chart Options
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        backgroundColor: '#111', 
        titleFont: { family: 'Syncopate', size: 14 }, 
        bodyFont: { family: 'Outfit', size: 16 }, 
        padding: 15, 
        borderColor: colors.accentPrimary, 
        borderWidth: 1 
      } 
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { color: '#888', font: { family: 'Space Mono', size: 12 }, padding: 10 } 
      },
      y: { 
        suggestedMax: goal,
        grid: { color: '#1a1a1a' }, 
        ticks: { 
          color: '#888', 
          font: { family: 'Outfit', size: 14 }, 
          padding: 10,
          callback: (v: any) => '฿' + (v/1000).toLocaleString() + 'k' 
        } 
      }
    },
    interaction: { intersect: false, mode: 'index' as const },
  }

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '80%',
    plugins: { 
      legend: { 
        position: 'bottom' as const, 
        labels: { color: '#aaa', font: { family: 'Outfit', size: 14 }, padding: 30, usePointStyle: true, pointStyle: 'circle' } 
      },
      tooltip: { 
        backgroundColor: '#111', 
        titleFont: { family: 'Syncopate', size: 14 }, 
        bodyFont: { family: 'Outfit', size: 16 }, 
        padding: 15, 
        borderColor: colors.accentPrimary, 
        borderWidth: 1 
      }
    }
  }

  // Chart Configs
  const lineData = {
    labels: data.map(d => `${MONTH_NAMES[d.Month-1].substring(0,3)} ${d.Year}`),
    datasets: [{
      label: 'Net Worth',
      data: data.map(d => d.netWorth || 0),
      borderColor: colors.accentPrimary,
      backgroundColor: 'rgba(212, 175, 55, 0.08)',
      borderWidth: 3,
      pointBackgroundColor: colors.bgBase,
      pointBorderColor: colors.accentPrimary,
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      fill: true,
      tension: 0.4
    }]
  }

  const doughnutData = {
    labels: ['Cash', 'Bitcoin', 'U.S Portfolio'],
    datasets: [{
      data: [latest['Cash Reserves'] || 0, latest['Bitcoin'] || 0, latest['U.S Portfolio'] || 0],
      backgroundColor: [colors.accentPrimary, colors.accentSecondary, colors.accentTertiary],
      borderColor: colors.bgBase,
      borderWidth: 3,
      hoverOffset: 15
    }]
  }

  return (
    <Box minH="100vh" bg={colors.bgBase} color={colors.textMain} pb={20} position="relative" overflow="hidden">
      {/* Abstract Background Elements */}
      <Box position="absolute" top="-20%" left="-10%" w="50%" h="50%" bg={colors.accentPrimary} filter="blur(300px)" opacity={0.03} zIndex={0} pointerEvents="none" />
      <Box position="absolute" bottom="-20%" right="-10%" w="50%" h="50%" bg={colors.accentTertiary} filter="blur(300px)" opacity={0.03} zIndex={0} pointerEvents="none" />

      <Container maxW="container.xl" pt={10} position="relative" zIndex={1}>
        
        {/* Header */}
        <Flex justify="space-between" align="flex-end" borderBottom={`1px solid ${colors.border}`} pb={8} mb={12}>
          <HStack spacing={6}>
            <Icon as={FiLayers} boxSize={10} color={colors.accentPrimary} />
            <Heading as="h1" fontFamily="Syncopate" letterSpacing="0.4em" color={colors.textMain} size="xl" fontWeight="300">
              AURUM<Text as="span" color={colors.accentPrimary} fontWeight="700">.</Text>
            </Heading>
          </HStack>
          <VStack align="flex-end" spacing={2}>
            <HStack spacing={4}>
              <VStack align="end" spacing={0}>
                <Text fontFamily="Space Mono" fontSize="xs" color={colors.textMuted} letterSpacing="0.1em">FINANCIAL GOAL</Text>
                <Input 
                  variant="unstyled" 
                  textAlign="right"
                  fontFamily="Outfit"
                  fontSize="xl"
                  fontWeight="600"
                  color={colors.accentPrimary}
                  w="180px"
                  value={goal}
                  type="number"
                  onChange={e => setGoal(parseFloat(e.target.value) || 0)}
                />
              </VStack>
              <Badge colorScheme="yellow" variant="outline" fontFamily="Space Mono" px={4} py={2} borderRadius="full" fontSize="xs">SECURE</Badge>
            </HStack>
            <Text fontFamily="Space Mono" fontSize="sm" color={colors.textMuted} letterSpacing="0.1em">SYS_V2 // FX: {fxRate.toFixed(2)} THB</Text>
          </VStack>
        </Flex>

        <Tabs variant="unstyled" colorScheme="yellow">
          <TabList gap={12} mb={12} borderBottom={`1px solid ${colors.border}`}>
            <Tab 
              _selected={{ color: colors.accentPrimary, borderBottom: `3px solid ${colors.accentPrimary}`, pb: "18px" }} 
              p={4} pb="20px" fontFamily="Syncopate" fontSize="md" letterSpacing="0.3em" color={colors.textMuted}
              transition="all 0.3s ease"
            >
              ARCHITECTURE
            </Tab>
            <Tab 
              _selected={{ color: colors.accentPrimary, borderBottom: `3px solid ${colors.accentPrimary}`, pb: "18px" }} 
              p={4} pb="20px" fontFamily="Syncopate" fontSize="md" letterSpacing="0.3em" color={colors.textMuted}
              transition="all 0.3s ease"
            >
              DEEP INSIGHTS
            </Tab>
          </TabList>

          <TabPanels>
            {/* --- ARCHITECTURE TAB --- */}
            <TabPanel p={0}>
              {/* Top Stats */}
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8} mb={12}>
                <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`} position="relative" overflow="hidden">
                  <Box position="absolute" top={0} left={0} w="full" h="3px" bg={colors.accentPrimary} />
                  <Stat>
                    <StatLabel fontFamily="Space Mono" fontSize="sm" color={colors.textMuted} letterSpacing="0.2em" mb={6}>AGGREGATED EQUITY</StatLabel>
                    <StatNumber fontFamily="Outfit" fontSize="5xl" fontWeight="600" mb={4} className="tabular-nums">
                      <Text as="span" color={colors.textMuted} fontSize="3xl" mr={3}>฿</Text>
                      {netWorth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </StatNumber>
                    <Flex justify="space-between" align="center" mb={4}>
                      <StatHelpText fontFamily="Space Mono" fontSize="md" m={0}>
                        <StatArrow type={(latest.delta || 0) >= 0 ? 'increase' : 'decrease'} color={(latest.delta || 0) >= 0 ? colors.success : colors.danger} />
                        <Text as="span" color={(latest.delta || 0) >= 0 ? colors.success : colors.danger} className="tabular-nums">
                          {Math.abs(latest.delta || 0).toLocaleString()} ({growthPercentage.toFixed(2)}%)
                        </Text>
                      </StatHelpText>
                      <Text fontFamily="Space Mono" fontSize="xs" color={colors.textMuted}>{((netWorth / goal) * 100).toFixed(1)}% OF GOAL</Text>
                    </Flex>
                    <Progress value={(netWorth / goal) * 100} size="sm" colorScheme="yellow" borderRadius="full" bg="rgba(255,255,255,0.05)" />
                  </Stat>
                </Box>

                <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`}>
                  <Stat>
                    <StatLabel fontFamily="Space Mono" fontSize="sm" color={colors.textMuted} letterSpacing="0.2em" mb={6}>GROSS EXPOSURE</StatLabel>
                    <StatNumber fontFamily="Outfit" fontSize="4xl" fontWeight="600" className="tabular-nums">
                      <Text as="span" color={colors.textMuted} fontSize="2xl" mr={3}>฿</Text>
                      {totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </StatNumber>
                  </Stat>
                </Box>

                <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`}>
                  <Stat>
                    <StatLabel fontFamily="Space Mono" fontSize="sm" color={colors.textMuted} letterSpacing="0.2em" mb={6}>TOTAL OBLIGATIONS</StatLabel>
                    <StatNumber fontFamily="Outfit" fontSize="4xl" fontWeight="600" className="tabular-nums">
                      <Text as="span" color={colors.textMuted} fontSize="2xl" mr={3}>฿</Text>
                      {(latest['Liabilities'] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </StatNumber>
                    {totalAssets > 0 && (
                       <VStack align="start" mt={6} spacing={2}>
                         <Text fontFamily="Space Mono" fontSize="xs" color={colors.textMuted}>LEVERAGE RATIO: {((latest['Liabilities'] || 0) / totalAssets * 100).toFixed(1)}%</Text>
                         <Progress value={((latest['Liabilities'] || 0) / totalAssets) * 100} size="xs" colorScheme="red" w="full" bg="#222" borderRadius="full" />
                       </VStack>
                    )}
                  </Stat>
                </Box>
              </Grid>

              {/* Charts */}
              <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8} mb={12}>
                <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`}>
                  <Flex justify="space-between" align="center" mb={8}>
                    <Text fontSize="sm" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.2em">GROWTH TRAJECTORY VS GOAL</Text>
                    <Icon as={FiActivity} color={colors.accentPrimary} boxSize={5} />
                  </Flex>
                  <Box h="450px"><Line data={lineData} options={chartOptions} /></Box>
                </Box>
                
                <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`}>
                  <Flex justify="space-between" align="center" mb={8}>
                    <Text fontSize="sm" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.2em">ASSET ALLOCATION</Text>
                    <Icon as={FiBriefcase} color={colors.accentPrimary} boxSize={5} />
                  </Flex>
                  <Box h="350px"><Doughnut data={doughnutData} options={doughnutOptions} /></Box>
                </Box>
              </Grid>

              {/* Ledger */}
              <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`}>
                <Text fontSize="sm" color={colors.textMuted} mb={8} fontFamily="Space Mono" letterSpacing="0.2em">IMMUTABLE LEDGER</Text>
                <TableContainer>
                  <Table variant="unstyled" size="md">
                    <Thead>
                      <Tr borderBottom={`2px solid ${colors.border}`}>
                        <Th color={colors.textMuted} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" fontSize="xs">PERIOD</Th>
                        <Th color={colors.textMuted} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" isNumeric fontSize="xs">CASH</Th>
                        <Th color={colors.textMuted} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" isNumeric fontSize="xs">BITCOIN</Th>
                        <Th color={colors.textMuted} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" isNumeric fontSize="xs">PORTFOLIO</Th>
                        <Th color={colors.accentPrimary} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" isNumeric fontSize="xs">NET WORTH</Th>
                        <Th color={colors.textMuted} pb={6} fontFamily="Space Mono" letterSpacing="0.1em" isNumeric fontSize="xs">CHANGE</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.slice().reverse().map((row, i) => (
                        <Tr key={i} _hover={{ bg: colors.bgCardHover }} transition="background 0.2s">
                          <Td py={6} fontFamily="Inter" color={colors.textMain} fontSize="md">{MONTH_NAMES[row.Month-1]} {row.Year}</Td>
                          <Td py={6} fontFamily="Outfit" className="tabular-nums" color={colors.textMuted} isNumeric fontSize="md">{row['Cash Reserves'].toLocaleString()}</Td>
                          <Td py={6} fontFamily="Outfit" className="tabular-nums" color={colors.textMuted} isNumeric fontSize="md">{row['Bitcoin'].toLocaleString()}</Td>
                          <Td py={6} fontFamily="Outfit" className="tabular-nums" color={colors.textMuted} isNumeric fontSize="md">{row['U.S Portfolio'].toLocaleString()}</Td>
                          <Td py={6} fontFamily="Outfit" className="tabular-nums" color={colors.textMain} isNumeric fontWeight="600" fontSize="lg">{(row.netWorth || 0).toLocaleString()}</Td>
                          <Td py={6} fontFamily="Outfit" className="tabular-nums" isNumeric>
                            <Badge 
                              colorScheme={(row.delta || 0) >= 0 ? "green" : "red"} 
                              variant="subtle" px={3} py={1.5} borderRadius="lg" fontFamily="Outfit" fontSize="sm"
                            >
                              {(row.delta || 0) !== 0 ? ((row.delta || 0) > 0 ? '▲' : '▼') + ' ' + Math.abs(row.delta || 0).toLocaleString() : '--'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </TabPanel>

            {/* --- INSIGHTS TAB --- */}
            <TabPanel p={0}>
              <Box p={10} bg={colors.bgCard} borderRadius="2xl" border={`1px solid ${colors.border}`} mb={12}>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={6}>
                  <VStack align="start" spacing={3} flex={1} minW="300px">
                    <Text fontSize="sm" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.2em">ANALYSIS PERIOD</Text>
                    <Select 
                      variant="flushed" bg="#1a1a1a" color={colors.textMain} fontFamily="Inter" size="lg" fontSize="xl" h="60px"
                      _hover={{ bg: "#222" }} _focus={{ borderBottomColor: colors.accentPrimary }}
                      value={insightIdx} onChange={e => setInsightIdx(parseInt(e.target.value))}
                    >
                      {data.map((d, i) => <option key={i} value={i} style={{background: '#000'}}>{MONTH_NAMES[d.Month-1]} {d.Year} Analysis</option>)}
                    </Select>
                  </VStack>
                  <VStack align="end" spacing={2}>
                    <Text fontSize="sm" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.2em">PERIOD PERFORMANCE</Text>
                    <HStack spacing={4}>
                      <Icon as={(data[insightIdx]?.delta || 0) >= 0 ? FiTrendingUp : FiTrendingDown} color={(data[insightIdx]?.delta || 0) >= 0 ? colors.success : colors.danger} boxSize={8} />
                      <Text fontSize="4xl" fontFamily="Outfit" fontWeight="600" className="tabular-nums" color={(data[insightIdx]?.delta || 0) >= 0 ? colors.textMain : colors.danger}>
                        ฿{Math.abs(data[insightIdx]?.delta || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </Text>
                    </HStack>
                  </VStack>
                </Flex>
              </Box>

              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={8}>
                <InsightCard 
                  title="CASH POSITION" icon={FiDollarSign} color={colors.accentPrimary}
                  current={data[insightIdx]?.["Cash Reserves"]} previous={insightIdx > 0 ? data[insightIdx-1]?.["Cash Reserves"] : undefined} 
                />
                <InsightCard 
                  title="CRYPTO ASSETS" icon={FiLock} color={colors.accentSecondary}
                  current={data[insightIdx]?.["Bitcoin"]} previous={insightIdx > 0 ? data[insightIdx-1]?.["Bitcoin"] : undefined} 
                />
                <InsightCard 
                  title="EQUITY PORTFOLIO" icon={FiBriefcase} color={colors.accentTertiary}
                  current={data[insightIdx]?.["U.S Portfolio"]} previous={insightIdx > 0 ? data[insightIdx-1]?.["U.S Portfolio"] : undefined} 
                />
                <InsightCard 
                  title="OBLIGATIONS" icon={FiActivity} color={colors.danger} inverse
                  current={data[insightIdx]?.["Liabilities"]} previous={insightIdx > 0 ? data[insightIdx-1]?.["Liabilities"] : undefined} 
                />
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Input Form Section */}
        <Box mt={24} borderTop={`1px solid ${colors.border}`} pt={24}>
          <Box p={12} bg={colors.bgCard} borderRadius="3xl" border={`1px solid ${colors.border}`} position="relative" overflow="hidden">
            <Box position="absolute" top={0} right={0} w="200px" h="200px" bg={colors.accentPrimary} filter="blur(150px)" opacity={0.1} pointerEvents="none" />
            
            <HStack mb={10} spacing={4}>
              <Icon as={FiPlus} color={colors.accentPrimary} boxSize={6} />
              <Text fontSize="lg" color={colors.textMain} fontFamily="Space Mono" letterSpacing="0.2em">ARCHITECT INPUT</Text>
            </HStack>
            
            <form onSubmit={handleSave}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={10} mb={12}>
                <FormControl label="YEAR">
                  <Input type="number" fontSize="lg" value={form.Year} onChange={e => { const v = parseInt(e.target.value); setForm({...form, Year: v}); syncForm(v, form.Month); }} />
                </FormControl>
                <FormControl label="MONTH">
                  <Select fontSize="lg" value={form.Month} onChange={e => { const v = parseInt(e.target.value); setForm({...form, Month: v}); syncForm(form.Year, v); }}>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i+1} style={{background: '#000'}}>{m}</option>)}
                  </Select>
                </FormControl>
                <FormControl label="CASH RESERVES (THB)">
                  <Input type="number" fontSize="lg" value={form["Cash Reserves"]} onChange={e => setForm({...form, "Cash Reserves": parseFloat(e.target.value) || 0})} />
                </FormControl>
                <FormControl label="BITCOIN (THB)">
                  <Input type="number" fontSize="lg" value={form["Bitcoin"]} onChange={e => setForm({...form, "Bitcoin": parseFloat(e.target.value) || 0})} />
                </FormControl>
                <FormControl label="U.S PORTFOLIO (THB)">
                  <Input type="number" fontSize="lg" value={form["U.S Portfolio"]} onChange={e => setForm({...form, "U.S Portfolio": parseFloat(e.target.value) || 0})} />
                </FormControl>
                <FormControl label="TOTAL OBLIGATIONS (THB)">
                  <Input type="number" fontSize="lg" value={form["Liabilities"]} onChange={e => setForm({...form, "Liabilities": parseFloat(e.target.value) || 0})} />
                </FormControl>
              </Grid>

              <Divider mb={10} borderColor={colors.border} />

              <Flex justify="space-between" align="center" flexWrap="wrap" gap={8}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.1em">PROJECTED NET WORTH</Text>
                  <Text fontSize="5xl" color={colors.accentPrimary} fontFamily="Outfit" fontWeight="600" className="tabular-nums">
                    ฿{((form["Cash Reserves"] + form["Bitcoin"] + form["U.S Portfolio"]) - form["Liabilities"]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </Text>
                </VStack>
                <Button 
                  type="submit" 
                  bg={colors.textMain} color={colors.bgBase}
                  borderRadius="full" h="70px" px={12} 
                  fontFamily="Space Mono" fontSize="md" letterSpacing="0.1em" fontWeight="bold"
                  _hover={{ bg: colors.accentPrimary, transform: "translateY(-3px)", boxShadow: "0 15px 30px -10px rgba(212,175,55,0.5)" }}
                  _active={{ transform: "translateY(0)" }}
                  transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                >
                  EXECUTE TRANSACTION
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

// --- Sub Components ---

function InsightCard({ title, current, previous, color, icon, inverse = false }: any) {
  const diff = (current || 0) - (previous || 0)
  const isPositive = diff >= 0
  const isGood = inverse ? !isPositive : isPositive
  
  return (
    <Box p={6} bg={colors.bgCard} borderRadius="xl" border={`1px solid ${colors.border}`} position="relative" overflow="hidden" _hover={{ borderColor: color, transform: 'translateY(-2px)' }} transition="all 0.3s">
      <Box position="absolute" top={0} left={0} w="4px" h="full" bg={color} />
      <Flex justify="space-between" align="flex-start" mb={4}>
        <Text fontSize="xs" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.1em">{title}</Text>
        <Icon as={icon} color={color} boxSize={5} opacity={0.8} />
      </Flex>
      <Text fontSize="2xl" color={colors.textMain} fontFamily="Outfit" fontWeight="500" className="tabular-nums" mb={3}>
        ฿{(current || 0).toLocaleString()}
      </Text>
      <Badge colorScheme={isGood ? 'green' : 'red'} variant="subtle" px={2} py={1} borderRadius="md" fontFamily="Outfit" className="tabular-nums">
        {diff !== 0 ? (isPositive ? '▲' : '▼') + ' ฿' + Math.abs(diff).toLocaleString() : 'NO CHANGE'}
      </Badge>
    </Box>
  )
}

function FormControl({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <VStack align="start" spacing={3}>
      <Text fontSize="xs" color={colors.textMuted} fontFamily="Space Mono" letterSpacing="0.1em">{label}</Text>
      <Box w="full" sx={{ 
        'input, select': { 
          bg: '#141414', border: '1px solid #222', borderRadius: 'lg', color: '#fff', h: '50px', px: 4, fontFamily: 'Inter',
          _focus: { borderColor: colors.accentPrimary, boxShadow: `0 0 0 1px ${colors.accentPrimary}`, bg: '#1a1a1a' },
          _hover: { borderColor: '#333' }
        }
      }}>
        {children}
      </Box>
    </VStack>
  )
}
