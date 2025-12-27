<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'

const emit = defineEmits(['navigate'])

const tasks = ref([])
const currentView = ref('today')
const showAddTaskModal = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const isLoading = ref(false)

const newTask = ref({
  title: '',
  description: '',
  category: 'other',
  date: new Date().toISOString().split('T')[0],
  time: ''
})

const currentDate = computed(() => 
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(task => task.date === today)
})

const showToast = (message) => {
  notificationMessage.value = message
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 2500)
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today'
  } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

const loadTasks = async () => {
  isLoading.value = true
  try {
    if (currentView.value === 'today') {
      const response = await api.tasks.getToday()
      tasks.value = response.data
    } else {
      const response = await api.tasks.getAll()
      tasks.value = response.data
    }
  } catch (error) {
    console.error('Error loading tasks:', error)
    showToast('Failed to load tasks')
  } finally {
    isLoading.value = false
  }
}

const addTask = async () => {
  if (!newTask.value.title.trim()) return

  try {
    const taskData = {
      title: newTask.value.title,
      description: newTask.value.description,
      category: newTask.value.category,
      date: newTask.value.date,
      time: newTask.value.time || null,
      status: 'pending'
    }

    const response = await api.tasks.create(taskData)
    tasks.value.unshift(response.data)
    
    // Reset form
    newTask.value = {
      title: '',
      description: '',
      category: 'other',
      date: new Date().toISOString().split('T')[0],
      time: ''
    }
    
    showAddTaskModal.value = false
    showToast('Task added successfully')
  } catch (error) {
    console.error('Error adding task:', error)
    showToast('Failed to add task')
  }
}

const toggleTask = async (id) => {
  try {
    const response = await api.tasks.toggleStatus(id)
    const taskIndex = tasks.value.findIndex(t => t.id === id)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = response.data
    }
    showToast(response.data.status === 'completed' ? 'Task completed!' : 'Task reopened')
  } catch (error) {
    console.error('Error toggling task:', error)
    showToast('Failed to update task')
  }
}

const deleteTask = async (id) => {
  try {
    await api.tasks.delete(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
    showToast('Task deleted')
  } catch (error) {
    console.error('Error deleting task:', error)
    showToast('Failed to delete task')
  }
}

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  emit('navigate', 'login')
}

onMounted(() => {
  loadTasks()
})
</script>