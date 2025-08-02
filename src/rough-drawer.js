import {gsap} from 'https://esm.run/gsap'
import {Draggable} from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/Draggable.min.js'
import {InertiaPlugin} from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/InertiaPlugin.min.js'

gsap.registerPlugin(Draggable, InertiaPlugin)

class RoughDrawer extends HTMLElement {
	isOpen = false
	maxDragDistance = 0
	snapThreshold = 0.25
	velocityThreshold = 0.4
	draggable = null
	dragStartTime = null
	dragStartPos = null
	direction = 'bottom'
	easing = 'cubic-bezier(0.32, 0.72, 0, 1)'
	duration = 0.3

	// Direction configuration
	static DIRECTIONS = {
		bottom: {
			axis: 'y',
			property: 'y',
			isVertical: true,
			multiplier: 1,
			closingSwipe: 1,
			openingSwipe: -1,
		},
		top: {
			axis: 'y',
			property: 'y',
			isVertical: true,
			multiplier: -1,
			closingSwipe: -1,
			openingSwipe: 1,
		},
		right: {
			axis: 'x',
			property: 'x',
			isVertical: false,
			multiplier: 1,
			closingSwipe: 1,
			openingSwipe: -1,
		},
		left: {
			axis: 'x',
			property: 'x',
			isVertical: false,
			multiplier: -1,
			closingSwipe: -1,
			openingSwipe: 1,
		},
	}

	connectedCallback() {
		// Parse direction attribute
		this.direction = this.getAttribute('direction') || 'bottom'
		const config = RoughDrawer.DIRECTIONS[this.direction]
		if (!config) {
			console.error(`Invalid direction: ${this.direction}. Using 'bottom'.`)
			this.direction = 'bottom'
		}

		this.render()
		this.overlay = this.querySelector('.rough-drawer-overlay')
		this.drawer = this.querySelector('.rough-drawer-panel')

		// Calculate max drag distance based on direction
		const rect = this.drawer.getBoundingClientRect()
		if (config.isVertical) {
			this.maxDragDistance = rect.height - 50 // 50px peek height
		} else {
			this.maxDragDistance = rect.width - 50 // 50px peek width
		}

		const threshold = this.getAttribute('snap-threshold')
		if (threshold) {
			this.snapThreshold = parseFloat(threshold) / 100 // Convert percentage to decimal
			console.log('setting snapThreshold', this.snapThreshold)
		}

		const velocityThreshold = this.getAttribute('velocity-threshold')
		if (velocityThreshold) {
			this.velocityThreshold = parseFloat(velocityThreshold)
			console.log('setting velocityThreshold', this.velocityThreshold)
		}

		this.setupDraggable()
		this.overlay.addEventListener('click', () => this.close())
		this.setClosedPosition()
		gsap.set(this.overlay, {opacity: 0})
	}

	render() {
		this.innerHTML = `
      <div class="rough-drawer-overlay"></div>
      <div class="rough-drawer-panel">
        <div class="rough-drawer-handle"></div>
        <div class="rough-drawer-content">
          <slot name="content"></slot>
        </div>
      </div>
    `
	}

	setupDraggable() {
		console.log(
			'setupDraggable',
			this.snapThreshold,
			this.maxDragDistance,
			this.direction,
		)

		const config = RoughDrawer.DIRECTIONS[this.direction]
		const bounds = this.getDragBounds()

		this.draggable = Draggable.create(this.drawer, {
			type: config.axis,
			bounds: bounds,
			allowNativeTouchScrolling: false,
			onPress: (e) => {
				this.dragStartTime = Date.now()
				this.dragStartPos = this.getEventPosition(e, config)
			},
			onDrag: () => {
				this.handleDrag()
			},
			onDragEnd: (e) => {
				this.handleDragEnd(e)
			},
		})[0]

		// Force touch-action to none after creation
		gsap.set(this.drawer, {touchAction: 'none'})

		console.log('✅ Draggable created:', !!this.draggable)
	}

	getDragBounds() {
		const config = RoughDrawer.DIRECTIONS[this.direction]

		if (config.isVertical) {
			return config.multiplier === 1
				? {minY: 0, maxY: this.maxDragDistance} // bottom
				: {minY: -this.maxDragDistance, maxY: 0} // top
		} else {
			return config.multiplier === 1
				? {minX: 0, maxX: this.maxDragDistance} // right
				: {minX: -this.maxDragDistance, maxX: 0} // left
		}
	}

	getEventPosition(e, config) {
		return config.isVertical ? e.pageY || e.clientY : e.pageX || e.clientX
	}

	setClosedPosition() {
		const config = RoughDrawer.DIRECTIONS[this.direction]
		const closedValue = this.maxDragDistance * config.multiplier
		gsap.set(this.drawer, {[config.property]: closedValue})
	}

	handleDrag() {
		const config = RoughDrawer.DIRECTIONS[this.direction]
		const currentPos = gsap.getProperty(this.drawer, config.property)
		const progress = Math.abs(currentPos) / this.maxDragDistance
		const opacity = 1 - progress
		gsap.set(this.overlay, {opacity})
		console.log('handleDrag', progress, config.property, currentPos)
		this.dispatchEvent(
			new CustomEvent('drawer-drag', {
				detail: {progress, [config.property]: currentPos},
			}),
		)
	}

	handleDragEnd(e) {
		const config = RoughDrawer.DIRECTIONS[this.direction]
		const currentPos = gsap.getProperty(this.drawer, config.property)
		const progress = Math.abs(currentPos) / this.maxDragDistance
		const openProgress = 1 - progress // 0 = closed, 1 = open

		// Calculate velocity if we have timing data
		let velocity = 0
		if (this.dragStartTime && this.dragStartPos && e) {
			const endTime = Date.now()
			const endPos = this.getEventPosition(e, config)
			const timeDiff = endTime - this.dragStartTime
			const posDiff = Math.abs(endPos - this.dragStartPos)

			if (timeDiff > 0) {
				velocity = posDiff / timeDiff
			}
		}

		console.log('Drag ended - velocity:', velocity, 'progress:', progress)

		// Check for fast swipe first (velocity-based closing)
		if (velocity > this.velocityThreshold) {
			const swipeDirection =
				this.dragStartPos && e
					? this.getEventPosition(e, config) - this.dragStartPos
					: 0

			// Determine if swipe is in closing direction
			const isClosingSwipe = this.isClosingSwipe(swipeDirection)
			const isOpeningSwipe = this.isOpeningSwipe(swipeDirection)

			if (this.isOpen && isClosingSwipe) {
				console.log('Fast swipe to close detected')
				this.close()
				return
			}
			if (!this.isOpen && isOpeningSwipe) {
				console.log('Fast swipe to open detected')
				this.open()
				return
			}
		}

		// Fall back to position-based logic
		if (this.isOpen) {
			// Currently open: need to drag below (1 - threshold) to close
			if (openProgress < 1 - this.snapThreshold) {
				this.close()
			} else {
				this.open() // Snap back to open
			}
		} else {
			// Currently closed: need to drag above threshold to open
			if (openProgress > this.snapThreshold) {
				this.open()
			} else {
				this.close() // Snap back to closed
			}
		}
	}

	isClosingSwipe(swipeDirection) {
		const config = RoughDrawer.DIRECTIONS[this.direction]
		return config ? Math.sign(swipeDirection) === config.closingSwipe : false
	}

	isOpeningSwipe(swipeDirection) {
		const config = RoughDrawer.DIRECTIONS[this.direction]
		return config ? Math.sign(swipeDirection) === config.openingSwipe : false
	}

	open() {
		this.isOpen = true
		this.setAttribute('open', '')
		const config = RoughDrawer.DIRECTIONS[this.direction]
		gsap.to(this.drawer, {
			[config.property]: 0,
			duration: this.duration,
			ease: this.easing,
		})
		gsap.to(this.overlay, {
			opacity: 1,
			duration: this.duration,
			ease: this.easing,
		})
		this.dispatchEvent(new CustomEvent('drawer-open'))
	}

	close() {
		this.isOpen = false
		this.removeAttribute('open')
		const config = RoughDrawer.DIRECTIONS[this.direction]
		const closedValue = this.maxDragDistance * config.multiplier
		gsap.to(this.drawer, {
			[config.property]: closedValue,
			duration: this.duration,
			ease: this.easing,
		})
		gsap.to(this.overlay, {
			opacity: 0,
			duration: this.duration,
			ease: this.easing,
		})
		this.dispatchEvent(new CustomEvent('drawer-close'))
	}
}

customElements.define('rough-drawer', RoughDrawer)
