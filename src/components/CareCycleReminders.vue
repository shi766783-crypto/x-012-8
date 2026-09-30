<script setup>
import { reactive } from 'vue'
import { CARE_CYCLE_CONFIG, CARE_POSTPONE_OPTIONS, NON_WATERING_CARE_TYPES } from '../constants/garden'
import { formatDate } from '../utils/date'

const props = defineProps({
  dueTasks: {
    type: Array,
    required: true,
  },
  upcomingTasks: {
    type: Array,
    required: true,
  },
  plants: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['skip', 'postpone', 'complete', 'set-frequency'])

const alivePlants = () => props.plants.filter((plant) => plant.alive !== false)
const postponeDays = reactive({})
const setting = reactive({ plantId: '', type: '施肥', frequency: 30 })

function getPostponeDays(task) {
  return postponeDays[task.key] ?? CARE_POSTPONE_OPTIONS[0]
}

function setPostponeDays(task, days) {
  postponeDays[task.key] = Number(days)
}

function handlePostpone(task) {
  emit('postpone', task, getPostponeDays(task))
}

function syncSettingFrequency() {
  const plant = props.plants.find((item) => item.id === setting.plantId)
  const field = CARE_CYCLE_CONFIG[setting.type]?.frequencyField
  setting.frequency = plant && field ? Number(plant[field]) || 0 : 0
}

function pickPlant() {
  syncSettingFrequency()
}

function pickType() {
  syncSettingFrequency()
}

function saveFrequency() {
  if (!setting.plantId) return
  emit(
    'set-frequency',
    setting.plantId,
    CARE_CYCLE_CONFIG[setting.type].frequencyField,
    Math.max(0, Number(setting.frequency) || 0),
  )
}

const firstPlant = alivePlants()[0]
if (firstPlant) {
  setting.plantId = firstPlant.id
  syncSettingFrequency()
}

function describeTiming(task) {
  if (task.status === '已过期') return `已逾期 ${Math.abs(task.diff)} 天`
  if (task.status === '待养护') return '今天到期'
  return `${task.diff} 天后到期`
}

function describeOffset(task) {
  if (!task.offsetDays) return ''
  return `（已${task.offsetDays > 0 ? `顺延 ${task.offsetDays} 天` : `提前 ${Math.abs(task.offsetDays)} 天`}）`
}
</script>

<template>
  <section class="panel care-cycle-panel">
    <div class="panel-heading">
      <h2>施肥 · 修剪 · 换盆 · 喷药</h2>
      <span>{{ dueTasks.length }} 项待办</span>
    </div>

    <div v-if="!dueTasks.length && !upcomingTasks.length" class="empty-state">
      还没有开启任何非浇水养护周期，可在下方为植物设置频率。
    </div>

    <div v-if="dueTasks.length" class="care-group">
      <h3 class="care-group-title due">待办养护</h3>
      <div class="care-list">
        <article v-for="task in dueTasks" :key="task.key" class="care-item">
          <div class="care-main">
            <div class="care-heading">
              <span :class="['care-type-tag', `care-type-${task.type}`]">{{ task.type }}</span>
              <strong>{{ task.plantName }}</strong>
              <span :class="['status-pill', task.status === '已过期' ? 'danger' : 'warning']">
                {{ task.status }}
              </span>
            </div>
            <p>
              {{ task.location || '未设置位置' }} · 每 {{ task.frequency }} 天一次 ·
              上次 {{ formatDate(task.lastDate) }} · 应于 {{ formatDate(task.dueDate) }}
              {{ describeTiming(task) }}{{ describeOffset(task) }}
            </p>
          </div>
          <div class="care-actions">
            <button class="care-btn primary" type="button" @click="emit('complete', task)">
              完成并记录
            </button>
            <button class="care-btn" type="button" @click="emit('skip', task)">跳过本次</button>
            <span class="postpone-box">
              顺延
              <select
                :value="getPostponeDays(task)"
                @change="setPostponeDays(task, $event.target.value)"
              >
                <option v-for="days in CARE_POSTPONE_OPTIONS" :key="days" :value="days">
                  {{ days }} 天
                </option>
              </select>
              <button class="care-btn" type="button" @click="handlePostpone(task)">确定</button>
            </span>
          </div>
        </article>
      </div>
    </div>

    <div v-if="upcomingTasks.length" class="care-group">
      <h3 class="care-group-title upcoming">即将到期</h3>
      <div class="care-list">
        <article v-for="task in upcomingTasks" :key="task.key" class="care-item upcoming">
          <div class="care-main">
            <div class="care-heading">
              <span :class="['care-type-tag', `care-type-${task.type}`]">{{ task.type }}</span>
              <strong>{{ task.plantName }}</strong>
              <span class="status-pill ok">{{ describeTiming(task) }}</span>
            </div>
            <p>
              每 {{ task.frequency }} 天一次 · 上次 {{ formatDate(task.lastDate) }} ·
              下次 {{ formatDate(task.dueDate) }}{{ describeOffset(task) }}
            </p>
          </div>
          <div class="care-actions">
            <button class="care-btn" type="button" @click="emit('skip', task)">跳过本次</button>
            <span class="postpone-box">
              顺延
              <select
                :value="getPostponeDays(task)"
                @change="setPostponeDays(task, $event.target.value)"
              >
                <option v-for="days in CARE_POSTPONE_OPTIONS" :key="days" :value="days">
                  {{ days }} 天
                </option>
              </select>
              <button class="care-btn" type="button" @click="handlePostpone(task)">确定</button>
            </span>
          </div>
        </article>
      </div>
    </div>

    <details class="care-settings">
      <summary>养护周期设置（0 天 = 关闭该类提醒）</summary>
      <div class="care-settings-row">
        <select v-model="setting.plantId" @change="pickPlant">
          <option value="">选择植物</option>
          <option v-for="plant in alivePlants()" :key="plant.id" :value="plant.id">
            {{ plant.name }}
          </option>
        </select>
        <select v-model="setting.type" @change="pickType">
          <option v-for="type in NON_WATERING_CARE_TYPES" :key="type" :value="type">{{ type }}</option>
        </select>
        <input v-model.number="setting.frequency" min="0" type="number" placeholder="频率（天）" />
        <button class="care-btn primary" type="button" @click="saveFrequency">保存频率</button>
      </div>
    </details>
  </section>
</template>
