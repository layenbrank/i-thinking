<script setup lang="ts">
const shutdown = () => {
  console.log("Shutting down...");
};

const restart = () => {
  console.log("Restarting...");
};

const lock = () => {
  console.log("Locking...");
};

const sleep = () => {
  console.log("Going to sleep...");
};

const signOut = () => {
  console.log("Signing out...");
};
</script>

<template>
  <div class="power-widget">
    <div class="power-options">
      <button class="power-button shutdown" @click="shutdown">
        <div class="icon">⭘</div>
        <span>Shut Down</span>
      </button>

      <button class="power-button restart" @click="restart">
        <div class="icon">↻</div>
        <span>Restart</span>
      </button>

      <button class="power-button lock" @click="lock">
        <div class="icon">🔒</div>
        <span>Lock</span>
      </button>
    </div>

    <div class="quick-actions">
      <button class="action-button sleep" @click="sleep">
        <div class="icon">😴</div>
        <span>Sleep</span>
      </button>

      <button class="action-button sign-out" @click="signOut">
        <div class="icon">↪️</div>
        <span>Sign out</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.power-widget {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 280px;
}

.power-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.power-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 0.75rem;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }

  .icon {
    font-size: 1.2rem;
    width: 1.5rem;
    text-align: center;
  }

  span {
    font-size: 0.9rem;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 0.75rem;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }

  .icon {
    font-size: 1.2rem;
  }

  span {
    font-size: 0.9rem;
  }
}
</style>
