<script setup>
import AchievementBoard from './components/AchievementBoard.vue'
import CareCycleReminders from './components/CareCycleReminders.vue'
import DashboardPanel from './components/DashboardPanel.vue'
import Leaderboards from './components/Leaderboards.vue'
import PlantForm from './components/PlantForm.vue'
import PlantList from './components/PlantList.vue'
import ProfileCenter from './components/ProfileCenter.vue'
import RecordForms from './components/RecordForms.vue'
import WateringReminders from './components/WateringReminders.vue'
import { useGardenStore } from './composables/useGardenStore'
import { todayISO } from './utils/date'

const {
  state,
  plantsWithStatus,
  dueWateringPlants,
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
} = useGardenStore()

function completeCareTask(task) {
  addCareRecord({
    plantId: task.plantId,
    date: todayISO(),
    type: task.type,
    amount: '',
    note: `按周期提醒完成${task.type}`,
    photo: '',
  })
}
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p>家庭园艺与植物养护管家</p>
        <h1>把浇水、施肥、生长和成就放进一个清爽的本地花园。</h1>
      </div>
      <span class="storage-note">纯前端 · 本地日期提醒 · Canvas 曲线</span>
    </header>

    <DashboardPanel :achievements="achievements" :dashboard="dashboard" :goals="goals" />

    <section class="main-grid">
      <div class="left-column">
        <WateringReminders :plants="dueWateringPlants" />
        <CareCycleReminders
          :due-tasks="dueCareTasks"
          :plants="state.plants"
          :upcoming-tasks="upcomingCareTasks"
          @complete="completeCareTask"
          @postpone="postponeCareCycle"
          @set-frequency="setCareFrequency"
          @skip="skipCareCycle"
        />
        <PlantList :plants="plantsWithStatus" />
      </div>
      <PlantForm @submit="addPlant" />
    </section>

    <RecordForms
      :plants="state.plants"
      @care="addCareRecord"
      @growth="addGrowthRecord"
      @pest="addPestRecord"
    />

    <Leaderboards :leaderboards="leaderboards" />
    <AchievementBoard :earned="achievements.earned" />

    <ProfileCenter
      :achievements="achievements"
      :care-records="state.careRecords"
      :get-plant-growth="getPlantGrowth"
      :get-plant-timeline="getPlantTimeline"
      :plants="state.plants"
    />
  </main>
</template>
