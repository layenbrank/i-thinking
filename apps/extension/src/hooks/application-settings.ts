interface ApplicationStyle {
	width: string
	height: string
	gridRow: string
	gridColumn: string
}

type ApplicationStyleMap = Record<
	ApplicationSize,
	Record<ApplicationShape, Record<ApplicationDirection, ApplicationStyle>>
>

export function useSettings(options: Application) {
	const width = options.width ?? 'var(--app-global-width)'
	const height = options.height ?? 'var(--app-global-height)'

	const componentStyleMap: ApplicationStyleMap = {
		mini: {
			circle: {
				horizontal: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				},
				vertical: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 2 + var(--app-global-col-gap))`,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 2'
				},
				vertical: {
					width,
					height: `calc(${height} * 2 + var(--app-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 1'
				}
			},
			square: {
				horizontal: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				},
				vertical: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				}
			}
		},
		small: {
			circle: {
				horizontal: {
					width: `calc(${width} * 2 + var(--app-global-col-gap))`,
					height: `calc(${height} * 2 + var(--app-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--app-global-col-gap))`,
					height: `calc(${height} * 2 + var(--app-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 2 + var(--app-global-row-gap) * 1)`,
					gridRow: 'span 2',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--app-global-col-gap) * 1)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 2'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 2 + var(--app-global-col-gap))`,
					height: `calc(${height} * 2 + var(--app-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--app-global-col-gap))`,
					height: `calc(${height} * 2 + var(--app-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				}
			}
		},
		medium: {
			circle: {
				horizontal: {
					width: `calc(${width} * 3 + var(--app-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--app-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--app-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--app-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 3 + var(--app-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--app-global-col-gap) * 2)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 3'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 3 + var(--app-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--app-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--app-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--app-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				}
			}
		},
		large: {
			circle: {
				horizontal: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 4'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--app-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--app-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				}
			}
		},
		huge: {
			circle: {
				horizontal: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 5'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--app-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--app-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				}
			}
		},
		massive: {
			circle: {
				horizontal: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 8 + var(--app-global-col-gap) * 7)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 8'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 8 + var(--app-global-row-gap) * 7)`,
					gridRow: 'span 8',
					gridColumn: 'span 6'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--app-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--app-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				}
			}
		},
		ultra: {
			circle: {
				horizontal: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 9 + var(--app-global-col-gap) * 8)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 9'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 9 + var(--app-global-row-gap) * 8)`,
					gridRow: 'span 9',
					gridColumn: 'span 7'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--app-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--app-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				}
			}
		}
	}

	// function componentStyle() {
	// 	return componentStyleMap[options.size][options.shape][options.direction]
	// }

	return componentStyleMap[options.size][options.shape][options.direction]
}
