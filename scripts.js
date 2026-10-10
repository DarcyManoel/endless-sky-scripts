let generationTextHeader = `#\tthis text was generated using endless-sky-scripts on github\n`
function scriptCheaterSales() {
	let shipNames = nodes
		.filter(node => node.line.startsWith(`ship `)) // select only nodes that define ships
		.filter(ship => {
			let names = [...ship.line.matchAll(/(['"`])(?:\\.|(?!\1).)*?\1/g)] // capture all quoted names in the line (handles mixed quote styles)
			let isVariant = names.length>1
			let hasChildAdd = ship.children.some(child => child.line.startsWith(`add `)) // check if any child line begins with 'add '
			return isVariant || !hasChildAdd // keep variant ships or base ships without 'add' children
		}) // exclude base ships that modify existing ships with 'add', keep all variant ships
		.map(ship => ship.line.match(/(['"`])(?:\\.|(?!\1).)*?\1/g)?.at(-1)) // extract only the last quoted ship name from the line, to account for variant ships
		.sort()
	let outfitNames = nodes
		.filter(node => node.line.startsWith(`outfit `)) // select only nodes that define outfits
		.filter(outfit => outfit.children
			.some(child => child.line.includes(`category`))
		) // keep only outfits with a child line containing 'category'
		.map(outfit => outfit.line.slice(7)) // extract outfit name by removing the node key
		.sort()
	copyToClipboard(`${generationTextHeader}shipyard "cheater: everything"\n\t${shipNames.join(`\n\t`)}\noutfitter "cheater: everything"\n\t${outfitNames.join(`\n\t`)}`) // copy formatted sales block to clipboard
}
function scriptCheaterMapEvents() {
	let systemNames = nodes
		.filter(node => node.line.startsWith(`system `)) // select only nodes that define systems
		.map(system => system.line.slice(7)) // extract system name by removing the node key
		.sort()
	let shroudedSystemNames = nodes
		.filter(node => node.line.startsWith(`system `)) // select only nodes that define systems
		.filter(system => system.children
			.some(child => child.line.includes(`shrouded`))
		) // keep only systems with a child line containing 'shrouded'
		.map(system => system.line.slice(7)) // extract system name by removing the node key
		.sort()
	copyToClipboard(`${generationTextHeader}event "cheater: reveal vanilla systems"\n\tvisit ${systemNames.join(`\n\tvisit `)}\nevent "cheater: reveal shrouded systems"${shroudedSystemNames.map(system => `\n\tsystem ${system}\n\t\tremove shrouded`).join(``)}`) // copy formatted event block that marks all vanilla systems as visited to clipboard
}

// unused upload png function
// function scriptConstellationsShip() {
// 	return new Promise((resolve, reject) => {
// 		// Create a dynamic input element completely in memory
// 		let input = document.createElement("input")
// 		input.type = "file"
// 		input.accept = "image/png" // Requests the OS to filter for PNGs
// 		// Set up the change listener to handle the selected file
// 		input.onchange = (event) => {
// 			let file = event.target.files[0]
// 			resolve(file)
// 		}
// 		// Trigger the native click event to open the OS file browser dialogue
// 		input.click()
// 	})
// }

function cycleSort(key, currentDirection) {
	let nextDirection = 'default'
	if (currentDirection === 'default') nextDirection = 'desc'
	else if (currentDirection === 'desc') nextDirection = 'asc'
	lastSortConfig = { key: key, direction: nextDirection }
	populateTable()
	console.log(lastSortConfig)
}
let draggedColumnIndex = null
function dragStart(event, index) {
	draggedColumnIndex = index
	event.dataTransfer.effectAllowed = 'move'
	event.dataTransfer.setData('text/plain', index)
	event.target.classList.add('dragging')
	// class to disable pseudo elements such as sorting indicators, descriptions, or tooltips
	document.body.classList.add('column-dragging')
	//
}
function dragOver(event, targetIndex) {
	event.preventDefault()
	if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) return
	const rect = event.currentTarget.getBoundingClientRect()
	const mouseX = event.clientX - rect.left
	const midPoint = rect.width / 2
	if (draggedColumnIndex < targetIndex && mouseX < midPoint) return
	if (draggedColumnIndex > targetIndex && mouseX > midPoint) return
	// update attributes order array
	const movedKey = attributesOrder[draggedColumnIndex]
	attributesOrder.splice(draggedColumnIndex, 1)
	attributesOrder.splice(targetIndex, 0, movedKey)
	//
	draggedColumnIndex = targetIndex
	populateTable()
}
function dragEnd() {
	draggedColumnIndex = null
	// remove dragging class
	document.body.classList.remove('column-dragging')
	//
	populateTable()
}
let presets = {
	Generators:{
		requiredAttributes: [
			`energy generation`
		],
		priorityColumns: [
			`category`,
			`cost`,
			`outfit space`,
			`engine capacity`,
			`energy generation`,
			`heat generation`
		]
	},
	Shields:{
		requiredAttributes: [
			`delayed shield generation`,
			`shield generation`

		],
		priorityColumns: [
			`category`,
			`cost`,
			`outfit space`,
			`shield generation`,
			`shield energy multiplier`,
			`shield energy`,
			`shield heat`
		]
	},
	Engines:{
		requiredAttributes: [
			`thrust`,
			`afterburner thrust`,
			`turn`

		],
		priorityColumns: [
			`category`,
			`cost`,
			`outfit space`,
			`thrust`,
			`afterburner thrust`,
			`turn`
		]
	}
}
document.getElementById(`tableCategories`).innerHTML=Object.keys(presets).map(preset => `<div class="tab" onclick="lastPresetName='',populateTable(this.innerText)">${preset}</div>`).join(``)
let substituteTooltips = [
	[
		`outfit space`,
		`Tons of general-purpose space this outfit provides.`
	]
]
let lastPresetName = Object.keys(presets)[0]
let attributesOrder
let lastSortConfig
function populateTable(presetName){
	let activePresetName
	if (!presetName && lastPresetName) presetName = lastPresetName
	preset = presets[presetName]
	let outfits = nodes
		.filter(node => node.line
			.startsWith(`outfit `)
		) // select only nodes that define outfits
		.filter(outfit => outfit.children
			.some(child => child.line
				.includes(`category`)
			)
		) // keep only outfits with a child line containing 'category'
		.filter(outfit => outfit.children
			.some(child => preset.requiredAttributes
				.some(attribute => child.line
					.replace(/"/g, ``)
					.startsWith(attribute)
				)
			)
		) // filter based on the dynamic tab preset parameter
	// build a dictionary mapping attribute names to their tooltip text descriptions
	let tooltips = nodes
		.filter(node => node.line.startsWith(`tip `))
		.map(node => {
			let key = node.line.slice(4).replace(/["']/g, '').trim()
			let descNode = node.children.find(child => child.line.trim().startsWith(`description `))
			let descValue = descNode 
				? descNode.line.trim().slice(12).replace(/^"|"$/g, '').trim() 
				: node.children.map(child => child.line.trim()).join(`\n`).replace(/^"|"$/g, '').trim()
			return [key, descValue]
		})
	//
	let priorityOrder = preset.priorityColumns || [`category`, `cost`, `outfit space`]
	let rawAttributes = [...new Set(
		outfits.flatMap(outfit =>
			outfit.children.map(child =>
				(child.line.trim().match(/^("(?:[^"\\]|\\.)*"|\S+)/)?.[1] || '')
				.replace(/["']/g, '')
			)
		)
	)].filter(key => key !== 'description' && key !== 'thumbnail')
	if(!attributesOrder || presetName !== lastPresetName)
		attributesOrder = [
			...priorityOrder.filter(key => rawAttributes.includes(key)),
			...rawAttributes.filter(key => !priorityOrder.includes(key)).sort()
		]
	if (lastSortConfig && lastSortConfig.direction !== 'default')
		outfits.sort((a, b) => {
			let getVal = (item) => {
				if (lastSortConfig.key === '__name__') return item.line.slice(7).replace(/["']/g, '').trim()
				let child = item.children.find(c => {
					let m = c.line.trim().match(/^("(?:[^"\\]|\\.)*"|\S+)/)
					return m && m[1].replace(/["']/g, '') === lastSortConfig.key
				})
				if (!child) return null
				let m = child.line.trim().match(/^("(?:[^"\\]|\\.)*"|\S+)/)
				let v = child.line.trim().substring(m[0].length).trim().replace(/^"|"$/g, '').trim()
				return v === '' ? 'Yes' : v
			}
			let valA = getVal(a)
			let valB = getVal(b)
			if (valA === null || valA === '-') return 1
			if (valB === null || valB === '-') return -1
			let numA = parseFloat(valA)
			let numB = parseFloat(valB)
			let isNum = !isNaN(numA) && !isNaN(numB)
			let comparison = isNum ? numA - numB : valA.localeCompare(valB)
			return lastSortConfig.direction === 'desc' ? -comparison : comparison
		})
	let headerRow = `<th><div class="name" data-sort="${lastSortConfig?.key === '__name__' ? lastSortConfig.direction : 'default'}" onclick="cycleSort('__name__', '${lastSortConfig?.key === '__name__' ? lastSortConfig.direction : 'default'}')">Outfit Name</div></th>` + attributesOrder.map((key, index) => {
		let tip = substituteTooltips.find(sub => sub === key)?.[1] || tooltips.find(attribute => attribute[0].startsWith(key))?.[1].slice(1, -1)
		let nextDir = lastSortConfig?.key === key ? lastSortConfig.direction : 'default'
		return	`<th ondragover="dragOver(event, ${index})" ondragend="dragEnd()">
					<div class="drag-circle${draggedColumnIndex === index ? ' dragging' : ''}" 
					     draggable="true" 
					     ondragstart="dragStart(event, ${index})"></div>
					<div class="name" data-sort="${nextDir}" ${tip?`description="${tip.replace(/"/g, `&quot;`)}"`:``} onclick="cycleSort('${key}', '${nextDir}')">${key}</div>
				</th>`
	}).join('')
	let bodyRows = outfits.map(outfit => {
		let outfitName = outfit.line.slice(7).replace(/["']/g, '').trim()
		let outfitAttributes = new Map()
		let tooltipText = {} // track the description text separately, to be found hovering the outfit name cell
		outfit.children.forEach(child => {
			let rawLine = child.line.trim()
			let match = rawLine.match(/^("(?:[^"\\]|\\.)*"|\S+)/)
			if (match) {
				let rawKey = match[1]
				let cleanKey = rawKey.replace(/["']/g, '')
				// strip the key out to isolate the trailing attribute value
				let cleanValue = rawLine.substring(rawKey.length).trim().replace(/^"|"$/g, '').trim()
				// store thumbnail and description for the hover tooltip
				if (cleanKey === 'thumbnail') tooltipText.thumbnail = cleanValue
				if (cleanKey === 'description') tooltipText.description = cleanValue
				//
				else outfitAttributes.set(cleanKey, cleanValue)
			}
		})
		// assemble row cell blocks according to attributes order
		let dataCells = attributesOrder.map(key => {
			let value = outfitAttributes.has(key) ? outfitAttributes.get(key) : '-'
			// handle attributes that exist as a bool and without a value
			if (outfitAttributes.has(key) && value === ``) value = `Yes`
			//
			return `<td>${value}</td>`
		}).join('')
		let nameCell = tooltipText
			? `<td description="${(`${tooltipText.thumbnail || ''}\n\n${tooltipText.description || ''}`).trim().replace(/"/g, `&quot;`)}"><b>${outfitName}</b></td>`
			: `<td><b>${outfitName}</b></td>`
		return `<tr>${nameCell}${dataCells}</tr>`
		//
	}).join(``)
	document.getElementById(`content`).innerHTML = `
		<table class="data-table">
			<thead>
				<tr>${headerRow}</tr>
			</thead>
			<tbody>
				${bodyRows}
			</tbody>
		</table>
	`
	if (preset) lastPresetName = presetName
}
document.querySelectorAll('.dropdown').forEach(element => element.classList.add('unavailable'))
let nodes = []
function parseLinesToTree() {
	nodes = []
	let stack = [{children:nodes, indent:-1}] // initialize stack with virtual root nodes for hierarchy tracking
	for(let fileText of dataFiles) {
		let lines = fileText
			.replace(/#.*$/gm, ``) // remove comments since Endless Sky uses `#` for comment lines
			.split(/\n/) // split text into lines to process sequentially
		for(let line of lines) {
			if(!line.trim()) continue // skip empty or whitespace-only lines since they hold no data
			let indent = line.match(/^\t*/)[0].length // count leading tabs to determine indentation depth
			let node = {line:line.trim(), children:[]} // create a node object with line content and empty children array
			while(stack.length && stack.at(-1).indent >= indent) stack.pop() // ensure the stack's top node has an indent smaller than the current line so we attach the node to the correct parent
			stack.at(-1).children.push(node) // attach current node to the most recent valid parent
			stack.push({...node, indent}) // push current node onto stack with its indent level to track nesting
		}
	}
	return nodes
}
let dataFiles = []
function importData() {
	let input = document.createElement(`input`)
	input.type = `file`
	input.webkitdirectory = true
	input.multiple = true
	input.style.display = `none`
	input.onchange = async event => {
		dataFiles = []
		for(let file of event.target.files) {
			try{
				if(!file.name.endsWith(`.txt`)) continue
				dataFiles.push(await file.text())
			}catch{}
		}
		parseLinesToTree()
		populateTable()
		document.querySelectorAll('.unavailable').forEach(element => element.classList.remove('unavailable'))
	}
	document.body.appendChild(input)
	input.click()
	document.body.removeChild(input)
}
function copyToClipboard(textToCopy) {
	try{
		navigator.clipboard.writeText(textToCopy)
		alert(`Text copied to clipboard.`)
	}catch(error) {
		alert('Failed to copy text: ', error)
	}
}