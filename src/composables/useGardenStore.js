import { computed, reactive, watch } from 'vue'
import { DEFAULT_GOALS } from '../constants/garden'
import { cycleKey, todayISO } from '../utils/date'
import { loadGardenState, saveGardenState } from '../services/storage'
import {
  buildLeaderboards,
  buildTimeline,
  calculateAchievements,
  createId,
  getCareCycleTasks,
  getDashboard,
  getDueWateringPlants,
  getWateringStatus,
  nextSkipOffset,
  postponeOffsetFromToday,
  updateWateringGoal,
} from '../services/gardenRules'

const demoState = {
  plants: [
    {
      id: 'plant-demo-1',
      name: '琴叶榕',
      variety: 'Ficus lyrata',
      category: '观叶',
      location: '客厅',
      lightNeed: '半阴',
      wateringFrequency: 4,
      fertilizerFrequency: 30,
      pruningFrequency: 43,
      repottingFrequency: 180,
      sprayingFrequency: 0,
      purchaseDate: '2026-08-18',
      lastWateredDate: '2026-09-12',
      potSize: '28cm 陶盆',
      soilType: '泥炭土混合珍珠岩',
      photo: '',
      alive: true,
    },
    {
      id: 'plant-demo-2',
      name: '蓝雪花',
      variety: 'Plumbago auriculata',
      category: '观花',
      location: '阳台',
      lightNeed: '全阳',
      wateringFrequency: 2,
      fertilizerFrequency: 14,
      pruningFrequency: 20,
      repottingFrequency: 365,
      sprayingFrequency: 0,
      purchaseDate: '2026-07-02',
      lastWateredDate: '2026-09-13',
      potSize: '20cm 加仑盆',
      soilType: '通用营养土',
      photo: '',
      alive: true,
    },
  ],
  careRecords: [
    {
      id: 'care-demo-1',
      plantId: 'plant-demo-2',
      date: '2026-09-14',
      type: '施肥',
      amount: '缓释肥 5g',
      note: '花量增加，叶色正常',
      photo: '',
    },
    {
      id: 'care-demo-2',
      plantId: 'plant-demo-1',
      date: '2026-09-12',
      type: '浇水',
      amount: '约 600ml',
      note: '盆底少量出水',
      photo: '',
    },
  ],
  growthRecords: [
    {
      id: 'growth-demo-1',
      plantId: 'plant-demo-1',
      date: '2026-08-20',
      height: 82,
      leafCount: 14,
      bloomState: '未开花',
    },
    {
      id: 'growth-demo-2',
      plantId: 'plant-demo-1',
      date: '2026-09-10',
      height: 88,
      leafCount: 17,
      bloomState: '未开花',
    },
    {
      id: 'growth-demo-3',
      plantId: 'plant-demo-2',
      date: '2026-09-08',
      height: 45,
      leafCount: 56,
      bloomState: '盛开',
    },
  ],
  pestRecords: [],
  careAdjustments: {},
  goals: DEFAULT_GOALS,
}

export function useGardenStore() {
  const storedState = loadGardenState()
  const state = reactive(storedState || demoState)
  if (!state.careAdjustments) state.careAdjustments = {}

  const plantsWithStatus = computed(() =>
    state.plants.map((plant) => ({ ...plant, wateringStatus: getWateringStatus(plant) })),
  )
  const dueWateringPlants = computed(() => getDueWateringPlants(state.plants))
  const careCycleTasks = computed(() =>
    getCareCycleTasks(state.plants, state.careRecords, state.careAdjustments),
  )
  const dueCareTasks = computed(() =>
    careCycleTasks.value.filter((task) => task.status === '待养护' || task.status === '已过期'),
  )
  const upcomingCareTasks = computed(() =>
    careCycleTasks.value.filter((task) => task.status === '未到期'),
  )
  const dashboard = computed(() =>
    getDashboard(state.plants, state.careRecords, state.growthRecords, state.careAdjustments),
  )
  const goals = computed(() => updateWateringGoal(state.goals, state.careRecords))
  const achievements = computed(() =>
    calculateAchievements(state.plants, state.careRecords, state.growthRecords, state.pestRecords, goals.value),
  )
  const leaderboards = computed(() => buildLeaderboards(state.plants, state.careRecords, state.growthRecords))

  watch(
    state,
    () => {
      saveGardenState({ ...state, goals: goals.value })
    },
    { deep: true },
  )

  function addPlant(payload) {
    state.plants.unshift({
      ...payload,
      id: createId('plant'),
      lastWateredDate: payload.lastWateredDate || payload.purchaseDate || todayISO(),
      alive: true,
    })
  }

  function addCareRecord(payload) {
    const record = { ...payload, id: createId('care') }
    state.careRecords.unshift(record)

    if (record.type === '浇水') {
      const plant = state.plants.find((item) => item.id === record.plantId)
      if (plant) plant.lastWateredDate = record.date
    } else {
      // 完成一次非浇水养护：最近操作已录入，旧的跳过/顺延偏移作废
      delete state.careAdjustments[cycleKey(record.plantId, record.type)]
    }
  }

  // 跳过一次：本次到期不做，直接滚动到下一个周期
  function skipCareCycle(task) {
    const current = state.careAdjustments[task.key]?.offsetDays || 0
    state.careAdjustments[task.key] = {
      offsetDays: nextSkipOffset(current, task.frequency),
      updatedAt: todayISO(),
    }
  }

  // 顺延一次：从今天起推后 days 天再提醒
  function postponeCareCycle(task, days) {
    state.careAdjustments[task.key] = {
      offsetDays: postponeOffsetFromToday(task, Number(days)),
      updatedAt: todayISO(),
    }
  }

  // 调整植物档案中某类养护的频率（天），0 表示关闭该类提醒
  function setCareFrequency(plantId, frequencyField, days) {
    const plant = state.plants.find((item) => item.id === plantId)
    if (plant) plant[frequencyField] = Math.max(0, Number(days) || 0)
  }

  function addGrowthRecord(payload) {
    state.growthRecords.unshift({ ...payload, id: createId('growth') })
  }

  function addPestRecord(payload) {
    state.pestRecords.unshift({ ...payload, id: createId('pest') })
  }

  function getPlantTimeline(plantId) {
    return buildTimeline(plantId, state.careRecords, state.growthRecords, state.pestRecords)
  }

  function getPlantGrowth(plantId) {
    return state.growthRecords
      .filter((record) => record.plantId === plantId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    state,
    plantsWithStatus,
    dueWateringPlants,
    careCycleTasks,
    dueCareTasks,
    upcomingCareTasks,
    dashboard,
    goals,
    achievements,
    leaderboards,
    addPlant,
    addCareRecord,
    addGrowthRecord,
    addPestRecord,
    skipCareCycle,
    postponeCareCycle,
    setCareFrequency,
    getPlantTimeline,
    getPlantGrowth,
  }
}
