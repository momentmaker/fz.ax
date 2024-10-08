<template>
  <div :class="['container', { 'modal-open': showModal }]">
    <h1 @click="openModal" class="title">four-thousand weekz</h1>
    <h3 class="subtitle">
      <span class="ngmi">{{ pastWeeksCount }}</span>-⬢ ⏣ ⬡-<span class="wagmi">{{ futureWeeksCount }}</span>
    </h3>

    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2 class="modal-header">d⬡b</h2>
        <input type="date" v-model="dob" @keyup.enter="saveDOB" />
        <button class="btn-76" @click="saveDOB">4⬢⏣⬡</button>
        <div class="modal-subtitle">will be saved to your local browser storage</div>
      </div>
    </div>

    <div class="hexagon-grid">
      <div v-for="(week, index) in weeks" :key="index" :id="index === currentWeek ? 'current-week' : null"
        :class="getHexagonClass(index)" @mouseover="hoverWeek(index)" class="hexagon">
        {{ getHexagonSymbol(index) }}
        <span :class="['hover-text', { 'hide-hover-text': showModal }]">{{ getWeekRange(index) }}</span>
      </div>
    </div>
  </div>

  <div :class="['hexagon-scroll', { toggled: showScrollButton }]" @click="scrollToTop">
    <div class="icon">⬢</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showModal: false,
      dob: '',
      currentWeek: 0,
      weeks: Array(4000).fill(null),
      today: new Date(),
      showScrollButton: false,
    };
  },
  mounted() {
    this.loadDOB();
    this.scrollToCurrentWeek();
    window.addEventListener('scroll', this.handleScroll);
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll);
  },
  computed: {
    pastWeeksCount() {
      return this.currentWeek;
    },
    futureWeeksCount() {
      return 4000 - this.currentWeek - 1;
    }
  },
  methods: {
    openModal() {
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    saveDOB() {
      if (this.dob) {
        localStorage.setItem('dob', this.dob);
        this.calculateCurrentWeek();
        this.showModal = false;
        this.recalculateHexagons();
        this.scrollToCurrentWeek();
      }
    },
    loadDOB() {
      const storedDob = localStorage.getItem('dob');
      if (storedDob) {
        this.dob = storedDob;
      } else {
        // Set default DOB to 4000 weeks ago from today
        const weeksAgo = 4000 * 7 * 24 * 60 * 60 * 1000;
        const defaultDob = new Date(this.today.getTime() - weeksAgo);
        this.dob = defaultDob.toISOString().split('T')[0];
        this.showModal = true;
      }
      this.calculateCurrentWeek();
      this.scrollToCurrentWeek();
    },
    calculateCurrentWeek() {
      if (this.dob) {
        const dobDate = new Date(this.dob);
        const timeDifference = this.today - dobDate;
        const totalWeeks = Math.floor(timeDifference / (1000 * 60 * 60 * 24 * 7));
        this.currentWeek = totalWeeks;
      }
    },
    recalculateHexagons() {
      this.weeks = Array(4000).fill(null);
    },
    scrollToCurrentWeek() {
      this.$nextTick(() => {
        // Use nextTick to ensure the DOM is updated before scrolling
        const currentWeekElement = document.getElementById('current-week');
        if (currentWeekElement) {
          currentWeekElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    getHexagonSymbol(index) {
      if (index < this.currentWeek) {
        return '⬢'; // Past weeks
      } else if (index === this.currentWeek) {
        return '⏣'; // Current week
      } else {
        return '⬡'; // Future weeks
      }
    },
    getHexagonClass(index) {
      return index === this.currentWeek ? 'current-week' : '';
    },
    hoverWeek(index) {
      // Logic for showing hover text with week range
    },
    getWeekRange(index) {
      const startDate = new Date(new Date(this.dob).getTime() + index * (7 * 24 * 60 * 60 * 1000));
      const endDate = new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000));
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    },
    handleScroll() {
      this.showScrollButton = window.scrollY > 100;
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};
</script>

<style scoped>
.container {
  text-align: center;
  padding: 2rem;
}

.modal-open .hexagon-grid {
  pointer-events: none;
}

.title {
  font-size: 2.1rem;
  cursor: pointer;
  color: #F7B808;
  display: inline-block;
  transition: all 0.7s ease;
  margin-bottom: 0px;
}

.title:hover {
  animation: pulsate 0.6s infinite;
}

.subtitle {
  color: #F7B808;
  font-size: 1.2rem;
}

.ngmi,
.wagmi {
  font-size: 0.7rem;
  vertical-align: middle;
  color: #0847F7;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  /* Darker overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 5px;
  text-align: center;
  z-index: 1001;
}

.hexagon-grid {
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-gap: 5px;
}

.hexagon {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  color: #0847F7;
}

.hover-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  border-radius: 5px;
  font-size: 0.75rem;
  visibility: hidden;
}

.hexagon:hover .hover-text {
  visibility: visible;
}

.hide-hover-text {
  display: none;
  /* Hide hover text when modal is open */
}

.modal-header {
  font-size: 2.1rem;
  color: #F7B808;
}

.modal-subtitle {
  font-size: 0.7rem;
}

input[type="date"] {
  padding: 0.5rem;
  margin: 0.5rem;
}

.btn-76,
.btn-76 *,
.btn-76 :after,
.btn-76 :before,
.btn-76:after,
.btn-76:before {
  border: 0 solid;
  box-sizing: border-box;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: button;
  background-color: #F7B808;
  background-image: none;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif,
    Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
  font-size: 100%;
  line-height: 1.5;
  margin: 0;
  -webkit-mask-image: -webkit-radial-gradient(#000, #fff);
  padding: 0;
}

.btn-76:disabled {
  cursor: default;
}

.btn-76:-moz-focusring {
  outline: auto;
}

.btn-76 svg {
  display: block;
  vertical-align: middle;
}

.btn-76 [hidden] {
  display: none;
}

.btn-76 {
  --neon: #0847F7;
  box-sizing: border-box;
  font-weight: 900;
  -webkit-mask-image: none;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.7rem 1rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
}

.btn-76:hover {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon),
    0 0 100px var(--neon);
  color: #fff;
  outline-color: transparent;
  transition: 0.2s linear 0.6s;
}

.btn-76 span {
  display: block;
  inset: 0;
  position: absolute;
}

.btn-76 .top {
  border-top: 4px solid var(--neon);
  opacity: 0;
  transform: translateX(calc(-100% + var(--progress, 0%)));
  transition: none;
}

.btn-76:hover .top {
  --progress: 100%;
  opacity: 1;
  transition: transform 0.2s linear;
}

.btn-76 .right {
  border-right: 4px solid var(--neon);
  opacity: 0;
  transform: translateY(calc(-100% + var(--progress, 0%)));
  transition: none;
}

.btn-76:hover .right {
  --progress: 100%;
  opacity: 1;
  transition: transform 0.2s linear 0.2s;
}

.btn-76 .bottom {
  border-bottom: 4px solid var(--neon);
  opacity: 0;
  transform: translateX(calc(100% - var(--progress, 0%)));
  transition: none;
}

.btn-76:hover .bottom {
  --progress: 100%;
  opacity: 1;
  transition: transform 0.2s linear 0.4s;
}

.btn-76 .left {
  border-left: 4px solid var(--neon);
  opacity: 0;
  transform: translateY(calc(100% - var(--progress, 0%)));
  transition: none;
}

.btn-76:hover .left {
  --progress: 100%;
  opacity: 1;
  transition: transform 0.2s linear 0.6s;
}

@media (max-width: 1024px) {
  .hexagon-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 768px) {
  .hexagon-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

@keyframes pulsate {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1);
  }
}
</style>
