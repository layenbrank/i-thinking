import type { SlideAppDirection, SlideAppShape, SlideAppSize } from '@/types/slide-app'
import type { CSSProperties } from 'vue'

interface AppSettings {
  mini: Ref<boolean>
  small: Ref<boolean>
  medium: Ref<boolean>
  large: Ref<boolean>
  huge: Ref<boolean>
  massive: Ref<boolean>
  ultra: Ref<boolean>
  width: Ref<string>
  height: Ref<string>
  horizontal: Ref<boolean>
  vertical: Ref<boolean>
  circle: Ref<boolean>
  rectangle: Ref<boolean>
  square: Ref<boolean>
}

interface AppStyle {
  width: string
  height: string
  gridRow: string
  gridColumn: string
}

type AppStylesMap = Record<SlideAppSize, Record<SlideAppShape, Record<SlideAppDirection, AppStyle>>>

export function useAppSettings(options: AppSettings) {
  const direction = computed(() => {
    if (options.horizontal.value) return 'horizontal'
    else if (options.vertical.value) return 'vertical'
    else return 'horizontal'
  })

  const shape = computed(() => {
    if (options.circle.value) return 'circle'
    else if (options.rectangle.value) return 'rectangle'
    else if (options.square.value) return 'square'
    else return 'square'
  })

  const size = computed(() => {
    if (options.mini.value) return 'mini'
    else if (options.small.value) return 'small'
    else if (options.medium.value) return 'medium'
    else if (options.large.value) return 'large'
    else if (options.huge.value) return 'huge'
    else if (options.massive.value) return 'massive'
    else if (options.ultra.value) return 'ultra'
    else return 'medium'
  })

  const appStylesMap: AppStylesMap = {
    mini: {
      circle: {
        horizontal: {
          width: options.width.value,
          height: options.height.value,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        },
        vertical: {
          width: options.width.value,
          height: options.height.value,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 2 + var(--app-global-col-gap))`,
          height: options.height.value,
          gridRow: 'initial',
          gridColumn: 'span 2'
        },
        vertical: {
          width: options.width.value,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'initial'
        }
      },
      square: {
        horizontal: {
          width: options.width.value,
          height: options.height.value,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        },
        vertical: {
          width: options.width.value,
          height: options.height.value,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        }
      }
    },
    small: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 2 + var(--app-global-col-gap))`,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        },
        vertical: {
          width: `calc(${options.width.value} * 2 + var(--app-global-col-gap))`,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'span 4'
        },
        vertical: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap)) * 2`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 3'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 2 + var(--app-global-col-gap))`,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        },
        vertical: {
          width: `calc(${options.width.value} * 2 + var(--app-global-col-gap))`,
          height: `calc(${options.height.value} * 2 + var(--app-global-row-gap))`,
          gridRow: 'span 2',
          gridColumn: 'span 2'
        }
      }
    },
    medium: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap) * 2)`,
          height: `calc(${options.height.value} * 3 + var(--app-global-row-gap) * 2)`,
          gridRow: 'span 3',
          gridColumn: 'span 3'
        },
        vertical: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap) * 2)`,
          height: `calc(${options.height.value} * 3 + var(--app-global-row-gap) * 2)`,
          gridRow: 'span 3',
          gridColumn: 'span 3'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 3 + var(--app-global-row-gap) * 2)`,
          gridRow: 'span 3',
          gridColumn: 'span 5'
        },
        vertical: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap) * 2)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 3'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap) * 2)`,
          height: `calc(${options.height.value} * 3 + var(--app-global-row-gap) * 2)`,
          gridRow: 'span 3',
          gridColumn: 'span 3'
        },
        vertical: {
          width: `calc(${options.width.value} * 3 + var(--app-global-col-gap) * 2)`,
          height: `calc(${options.height.value} * 3 + var(--app-global-row-gap) * 2)`,
          gridRow: 'span 3',
          gridColumn: 'span 3'
        }
      }
    },
    large: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 4'
        },
        vertical: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 4'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 6'
        },
        vertical: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 4'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 4'
        },
        vertical: {
          width: `calc(${options.width.value} * 4 + var(--app-global-col-gap) * 3)`,
          height: `calc(${options.height.value} * 4 + var(--app-global-row-gap) * 3)`,
          gridRow: 'span 4',
          gridColumn: 'span 4'
        }
      }
    },
    huge: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 5'
        },
        vertical: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 5'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 7'
        },
        vertical: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 5'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 5'
        },
        vertical: {
          width: `calc(${options.width.value} * 5 + var(--app-global-col-gap) * 4)`,
          height: `calc(${options.height.value} * 5 + var(--app-global-row-gap) * 4)`,
          gridRow: 'span 5',
          gridColumn: 'span 5'
        }
      }
    },
    massive: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 6'
        },
        vertical: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 6'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 8 + var(--app-global-col-gap) * 7)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 8'
        },
        vertical: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 8 + var(--app-global-row-gap) * 7)`,
          gridRow: 'span 8',
          gridColumn: 'span 6'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 6'
        },
        vertical: {
          width: `calc(${options.width.value} * 6 + var(--app-global-col-gap) * 5)`,
          height: `calc(${options.height.value} * 6 + var(--app-global-row-gap) * 5)`,
          gridRow: 'span 6',
          gridColumn: 'span 6'
        }
      }
    },
    ultra: {
      circle: {
        horizontal: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 7'
        },
        vertical: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 7'
        }
      },
      rectangle: {
        horizontal: {
          width: `calc(${options.width.value} * 9 + var(--app-global-col-gap) * 8)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 9'
        },
        vertical: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 9 + var(--app-global-row-gap) * 8)`,
          gridRow: 'span 9',
          gridColumn: 'span 7'
        }
      },
      square: {
        horizontal: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 7'
        },
        vertical: {
          width: `calc(${options.width.value} * 7 + var(--app-global-col-gap) * 6)`,
          height: `calc(${options.height.value} * 7 + var(--app-global-row-gap) * 6)`,
          gridRow: 'span 7',
          gridColumn: 'span 7'
        }
      }
    }
  }
  const appStyle = computed(() => {
    return appStylesMap[size.value][shape.value][direction.value]
  })

  return {
    appStyle
  }
}
