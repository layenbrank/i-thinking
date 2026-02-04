import { create } from 'zustand'

interface CounterStore {
  counter: number
  increment: () => void
  decrement: () => void
}

export const useCounterStore = create<CounterStore>(function (set) {
  const store: CounterStore = {
    counter: 0,
    increment() {
      return set(function (state) {
        return {
          counter: state.counter + 1
        }
      })
    },
    decrement() {
      return set(function (state) {
        return {
          counter: state.counter - 1
        }
      })
    }
  }
  return store
})
