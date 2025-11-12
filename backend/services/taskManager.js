/**
 * Gestionnaire de tâches asynchrones pour les imports Gmail
 */
class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.taskIdCounter = 1;
  }

  /**
   * Crée une nouvelle tâche
   */
  createTask(type, description, userId = 'default') {
    const taskId = `${type}_${this.taskIdCounter++}_${Date.now()}`;
    
    const task = {
      id: taskId,
      type: type,
      description: description,
      userId: userId,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      endTime: null,
      duration: null,
      result: null,
      error: null,
      logs: [],
      details: {
        totalEmails: 0,
        processedEmails: 0,
        totalFiles: 0,
        processedFiles: 0,
        downloadedFiles: 0,
        importedFiles: 0,
        errors: 0,
        currentStep: 'Initialisation...'
      }
    };

    this.tasks.set(taskId, task);
    console.log(`🆕 Tâche créée: ${taskId} - ${description}`);
    
    return task;
  }

  /**
   * Met à jour le statut d'une tâche
   */
  updateTaskStatus(taskId, status, progress = null, details = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`❌ Tâche introuvable: ${taskId}`);
      return false;
    }

    task.status = status;
    if (progress !== null) {
      task.progress = Math.min(100, Math.max(0, progress));
    }
    
    // Mettre à jour les détails
    Object.assign(task.details, details);
    
    if (status === 'completed' || status === 'failed') {
      task.endTime = new Date();
      task.duration = task.endTime - task.startTime;
    }

    console.log(`🔄 Tâche ${taskId}: ${status} (${task.progress}%) - ${task.details.currentStep}`);
    return true;
  }

  /**
   * Ajoute un log à une tâche
   */
  addTaskLog(taskId, level, message, data = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`❌ Tâche introuvable pour log: ${taskId}`);
      return false;
    }

    const logEntry = {
      timestamp: new Date(),
      level: level, // 'info', 'warn', 'error', 'success'
      message: message,
      data: data
    };

    task.logs.push(logEntry);
    
    // Garder seulement les 100 derniers logs pour éviter la surcharge mémoire
    if (task.logs.length > 100) {
      task.logs = task.logs.slice(-100);
    }

    console.log(`📝 [${taskId}] ${level.toUpperCase()}: ${message}`);
    return true;
  }

  /**
   * Finalise une tâche avec succès
   */
  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`❌ Tâche introuvable pour completion: ${taskId}`);
      return false;
    }

    task.result = result;
    this.updateTaskStatus(taskId, 'completed', 100, { currentStep: 'Terminé avec succès' });
    this.addTaskLog(taskId, 'success', 'Tâche terminée avec succès', result);
    
    return true;
  }

  /**
   * Marque une tâche comme échouée
   */
  failTask(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`❌ Tâche introuvable pour échec: ${taskId}`);
      return false;
    }

    task.error = error.message || error.toString();
    this.updateTaskStatus(taskId, 'failed', null, { currentStep: `Erreur: ${task.error}` });
    this.addTaskLog(taskId, 'error', 'Tâche échouée', error);
    
    return true;
  }

  /**
   * Récupère une tâche
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Récupère toutes les tâches d'un utilisateur
   */
  getUserTasks(userId = 'default') {
    return Array.from(this.tasks.values())
      .filter(task => task.userId === userId)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Nettoie les anciennes tâches (plus de 24h)
   */
  cleanupOldTasks() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [taskId, task] of this.tasks) {
      if (task.startTime < oneDayAgo && (task.status === 'completed' || task.status === 'failed')) {
        this.tasks.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Nettoyage: ${cleaned} anciennes tâches supprimées`);
    }

    return cleaned;
  }

  /**
   * Récupère les statistiques des tâches
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }
}

// Instance singleton
const taskManager = new TaskManager();

// Nettoyage automatique toutes les heures
setInterval(() => {
  taskManager.cleanupOldTasks();
}, 60 * 60 * 1000);

module.exports = taskManager;