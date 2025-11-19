// ============================================================================
// ACE TRAINING PROGRESS TRACKER v2.0
// Unified progress tracking system for all training modules
// ============================================================================

class AceProgressTracker {
  constructor() {
    this.config = {
      modules: {
        classroom: { name: 'Classroom', baseXP: 25, icon: '📚' },
        flashcards: { name: 'Flashcards', baseXP: 15, icon: '🎴' },
        practice: { name: 'Practice Test', baseXP: 30, icon: '✍️' },
        jeopardy: { name: 'Jeopardy', baseXP: 35, icon: '🎯' }
      },
      xpMultipliers: {
        perfect: 2.0,    // 100% score
        excellent: 1.5,  // 90-99%
        good: 1.2,       // 80-89%
        passing: 1.0,    // 70-79%
        low: 0.5         // Below 70%
      },
      storageKey: 'aceProgress_v2'
    };
    
    this.state = this.loadState();
    this.initializeUI();
  }

  loadState() {
    const saved = localStorage.getItem(this.config.storageKey);
    return saved ? JSON.parse(saved) : {
      sessionId: this.generateSessionId(),
      sessionStart: Date.now(),
      modulesCompleted: {},
      totalXP: 0,
      currentStreak: 0,
      lastActivity: Date.now()
    };
  }

  saveState() {
    localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate XP based on module and score - SIMPLIFIED!
  calculateXP(module, score) {
    const moduleConfig = this.config.modules[module];
    if (!moduleConfig) return 0;

    let multiplier = 1.0;
    if (score === 100) multiplier = this.config.xpMultipliers.perfect;
    else if (score >= 90) multiplier = this.config.xpMultipliers.excellent;
    else if (score >= 80) multiplier = this.config.xpMultipliers.good;
    else if (score >= 70) multiplier = this.config.xpMultipliers.passing;
    else multiplier = this.config.xpMultipliers.low;

    // First completion bonus
    const firstTimeBonus = !this.state.modulesCompleted[module] ? 10 : 0;
    
    // Calculate final XP
    const baseXP = moduleConfig.baseXP;
    const earnedXP = Math.round((baseXP * multiplier) + firstTimeBonus);
    
    return earnedXP;
  }

  // Main completion handler
  completeModule(module, score) {
    console.log(`[ACE Tracker] Module: ${module}, Score: ${score}%`);
    
    const xpEarned = this.calculateXP(module, score);
    
    // Update state
    this.state.modulesCompleted[module] = {
      completed: true,
      score: score,
      timestamp: Date.now(),
      xpEarned: xpEarned
    };
    
    this.state.totalXP += xpEarned;
    this.state.lastActivity = Date.now();
    
    // Save state
    this.saveState();
    
    // Update UI
    this.updateProgressBar();
    this.showCompletionToast(module, score, xpEarned);
    
    // Report to parent if in iframe
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'moduleComplete',
          module: module,
          score: score,
          xpEarned: xpEarned,
          sessionId: this.state.sessionId
        }, '*');
      } catch (e) {
        console.error('[ACE Tracker] Could not communicate with parent:', e);
      }
    }
    
    // Also try calling parent's completeModule for backwards compatibility
    if (window.parent && window.parent.completeModule) {
      try {
        window.parent.completeModule(module, score);
      } catch (e) {
        console.error('[ACE Tracker] Could not call parent completeModule:', e);
      }
    }
    
    return xpEarned;
  }

  // Initialize progress bar UI
  initializeUI() {
    // Don't add UI if we're in the parent frame
    if (window.parent === window) return;
    
    // Check if progress bar already exists
    if (document.getElementById('ace-progress-bar')) return;
    
    const progressBar = document.createElement('div');
    progressBar.id = 'ace-progress-bar';
    progressBar.innerHTML = `
      <style>
        #ace-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: linear-gradient(90deg, #0a0e1a 0%, #1a1e2e 100%);
          border-bottom: 2px solid #00ffff;
          z-index: 9999;
          display: flex;
          align-items: center;
          padding: 0 20px;
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          color: #fff;
          box-shadow: 0 2px 10px rgba(0,255,255,0.3);
        }
        
        .ace-module-indicator {
          display: inline-flex;
          align-items: center;
          margin-right: 20px;
          padding: 4px 12px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .ace-module-indicator.completed {
          background: linear-gradient(135deg, #00ff41, #00cc33);
          border-color: #00ff41;
          color: #000;
          font-weight: bold;
          animation: module-complete 0.5s ease;
        }
        
        @keyframes module-complete {
          0% { transform: scale(0.8) rotate(-5deg); }
          50% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }
        
        .ace-xp-counter {
          margin-left: auto;
          font-weight: bold;
          color: #ffcc00;
          text-shadow: 0 0 10px rgba(255,204,0,0.5);
        }
        
        .ace-completion-toast {
          position: fixed;
          top: 60px;
          right: 20px;
          background: linear-gradient(135deg, #1a1e2e, #2a2e3e);
          border: 2px solid #00ff41;
          border-radius: 12px;
          padding: 16px 20px;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0,255,65,0.4);
          animation: toast-slide 0.5s ease;
          max-width: 300px;
        }
        
        @keyframes toast-slide {
          from { transform: translateX(400px); }
          to { transform: translateX(0); }
        }
        
        .ace-toast-title {
          font-weight: bold;
          color: #00ff41;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .ace-toast-details {
          color: #fff;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .ace-toast-xp {
          color: #ffcc00;
          font-weight: bold;
          font-size: 16px;
          margin-top: 8px;
        }
        
        /* Adjust page content to account for progress bar */
        body {
          padding-top: 48px !important;
        }
      </style>
      <div class="ace-module-indicator" data-module="classroom">
        📚 Classroom
      </div>
      <div class="ace-module-indicator" data-module="flashcards">
        🎴 Flashcards
      </div>
      <div class="ace-module-indicator" data-module="practice">
        ✍️ Practice
      </div>
      <div class="ace-module-indicator" data-module="jeopardy">
        🎯 Jeopardy
      </div>
      <div class="ace-xp-counter">
        Total XP: <span id="ace-total-xp">${this.state.totalXP}</span>
      </div>
    `;
    
    document.body.appendChild(progressBar);
    this.updateProgressBar();
  }

  updateProgressBar() {
    // Update module indicators
    Object.keys(this.config.modules).forEach(module => {
      const indicator = document.querySelector(`[data-module="${module}"]`);
      if (indicator && this.state.modulesCompleted[module]) {
        indicator.classList.add('completed');
        indicator.innerHTML = `${this.config.modules[module].icon} ✓ ${this.state.modulesCompleted[module].score}%`;
      }
    });
    
    // Update XP counter
    const xpCounter = document.getElementById('ace-total-xp');
    if (xpCounter) {
      xpCounter.textContent = this.state.totalXP;
    }
  }

  showCompletionToast(module, score, xpEarned) {
    const toast = document.createElement('div');
    toast.className = 'ace-completion-toast';
    toast.innerHTML = `
      <div class="ace-toast-title">✅ Module Complete!</div>
      <div class="ace-toast-details">
        ${this.config.modules[module].icon} ${this.config.modules[module].name}<br>
        Score: ${score}%<br>
        ${score >= 90 ? '⭐ Excellent!' : score >= 80 ? '👍 Good job!' : score >= 70 ? '✓ Passed' : '📚 Keep studying!'}
      </div>
      <div class="ace-toast-xp">+${xpEarned} XP</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toast-slide 0.5s ease reverse';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  // Quick completion function for manual triggers
  quickComplete(module, score = 85) {
    return this.completeModule(module, score);
  }

  // Get current progress summary
  getProgressSummary() {
    const completed = Object.keys(this.state.modulesCompleted).length;
    const total = Object.keys(this.config.modules).length;
    const percentage = Math.round((completed / total) * 100);
    
    return {
      modulesCompleted: completed,
      totalModules: total,
      percentComplete: percentage,
      totalXP: this.state.totalXP,
      sessionTime: Math.round((Date.now() - this.state.sessionStart) / 1000),
      details: this.state.modulesCompleted
    };
  }

  // Reset progress (for testing)
  resetProgress() {
    if (confirm('Reset all progress? This cannot be undone!')) {
      localStorage.removeItem(this.config.storageKey);
      this.state = this.loadState();
      this.updateProgressBar();
      location.reload();
    }
  }
}

// Initialize tracker when DOM is ready
let aceTracker = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    aceTracker = new AceProgressTracker();
  });
} else {
  aceTracker = new AceProgressTracker();
}

// Global function for backwards compatibility
window.completeModuleAce = function(module, score) {
  if (!aceTracker) aceTracker = new AceProgressTracker();
  return aceTracker.completeModule(module, score);
};

// Auto-detect current module from filename
const currentFile = window.location.pathname.split('/').pop().toLowerCase();
let currentModule = null;
if (currentFile.includes('classroom')) currentModule = 'classroom';
else if (currentFile.includes('flash')) currentModule = 'flashcards';
else if (currentFile.includes('practice')) currentModule = 'practice';
else if (currentFile.includes('jeopardy')) currentModule = 'jeopardy';

// Export for use
window.ACE_MODULE = currentModule;
window.aceTracker = aceTracker;

// Console helper functions for debugging
console.log('[ACE Tracker] Initialized. Module detected:', currentModule);
console.log('[ACE Tracker] Commands: aceTracker.getProgressSummary(), aceTracker.quickComplete("module", score), aceTracker.resetProgress()');
