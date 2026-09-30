<script setup>
import { CARE_POSTPONE_DAYS } from '../constants/garden'
import { formatDate } from '../utils/date'

defineProps({
  dueItems: {
    type: Array,
    required: true,
  },
  upcomingItems: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['skip', 'postpone'])

function dueHint(item) {
  if (item.status === '已过期') return `已逾期 ${-item.remaining} 天`
  return '今天到期'
}

function upcomingHint(item) {
  if (item.status === '已顺延') return `已顺延至 ${formatDate(item.dueDate)}`
  if (item.remaining === 1) return '明天到期'
  return `${item.remaining} 天后到期`
}
</script>

<template>
  <section class="panel care-reminders-panel">
    <div class="panel-heading">
      <h2>养护周期待办</h2>
      <span>{{ dueItems.length }} 项</span>
    </div>

    <div v-if="!dueItems.length" class="empty-state">施肥、修剪、换盆、喷药都在周期内，暂无需处理。</div>

    <div v-else class="reminder-list">
      <article v-for="item in dueItems" :key="item.key" class="reminder-item care-reminder-item">
        <div>
          <strong>
            <span :class="['care-type-badge', `care-${item.type}`]">{{ item.type }}</span>
            {{ item.plantName }}
          </strong>
          <p>
            {{ item.location }} · 每 {{ item.frequency }} 天一次 · 上次 {{ formatDate(item.lastDate) }} ·
            到期 {{ formatDate(item.dueDate) }} · {{ dueHint(item) }}
          </p>
        </div>
        <div class="care-actions">
          <span :class="['status-pill', item.status === '已过期' ? 'danger' : 'warning']">{{ item.status }}</span>
          <button type="button" class="care-btn" @click="emit('postpone', item)">
            顺延 {{ CARE_POSTPONE_DAYS }} 天
          </button>
          <button type="button" class="care-btn" @click="emit('skip', item)">跳过本次</button>
        </div>
      </article>
    </div>

    <div v-if="upcomingItems.length" class="care-upcoming">
      <h3>近期安排</h3>
      <ul class="care-upcoming-list">
        <li v-for="item in upcomingItems" :key="item.key">
          <span :class="['care-type-badge', `care-${item.type}`]">{{ item.type }}</span>
          <strong>{{ item.plantName }}</strong>
          <time>{{ formatDate(item.dueDate) }}</time>
          <em :class="{ postponed: item.status === '已顺延' }">{{ upcomingHint(item) }}</em>
        </li>
      </ul>
    </div>
  </section>
</template>
