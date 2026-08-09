// content management
let selectedCategory
function selectCategory(categoryName) {
	// cancel function if selecting the already selected category
	if(categoryName === selectedCategory) {
		return
	}
	// maintain a visual for a selected category
	for(let category of document.getElementsByClassName(`category`)) {
		if(category.innerText === categoryName) {
			category.classList.add(`is-selected`)
			continue
		}
		category.classList.remove(`is-selected`)
	}
	//
	if(selectedCategory) {
		document.getElementById(`sidebar${selectedCategory}`).classList.remove(`is-selected`)
		document.getElementById(`content${selectedCategory}`).classList.remove(`is-selected`)
	}
	selectedCategory = categoryName
	document.getElementById(`sidebar${selectedCategory}`).classList.add(`is-selected`)
	document.getElementById(`content${selectedCategory}`).classList.add(`is-selected`)
}
let selectedTab
function selectTab(tabName) {
	// cancel function if selecting the already selected tab
	if(tabName === selectedTab) {
		return
	}
	// maintain a visual for a selected tab
	for(let tab of document.getElementsByClassName(`tab`)) {
		if(tab.innerText === tabName) {
			tab.classList.add(`is-selected`)
			continue
		}
		tab.classList.remove(`is-selected`)
	}
	//
	if(selectedTab) {
		document.getElementById(`tab${selectedTab}`).classList.remove(`is-selected`)
	}
	selectedTab = tabName
	document.getElementById(`tab${selectedTab}`).classList.add(`is-selected`)
}
//
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
let presets = {
	Generators:{
		requiredAttribute: `energy generation`,
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
		requiredAttribute: `shield generation`,
		priorityColumns: [
			`category`,
			`cost`,
			`outfit space`,
			`shield generation`,
			`shield energy multiplier`,
			`shield heat`
		]
	}
}
function populateTable(preset) {
	preset = presets[preset]
	let outfits = nodes
		.filter(node => node.line.startsWith(`outfit `)) // select only nodes that define outfits
		.filter(outfit => outfit.children
			.some(child => child.line.includes(`category`))
		) // keep only outfits with a child line containing 'category'
		.filter(outfit => outfit.children
			.some(child => child.line.includes(preset.requiredAttribute))
		) // DYNAMIC CHANGE: filter based on the dynamic tab preset parameter

	let priorityOrder = preset.priorityColumns || [`category`, `cost`, `outfit space`]
	let rawAttributes = [...new Set(
		outfits.flatMap(outfit =>
			outfit.children.map(child =>
				(child.line.trim().match(/^("(?:[^"\\]|\\.)*"|\S+)/)?.[1] || '')
				.replace(/["']/g, '')
			)
		)
	)].filter(key => key !== 'description' && key !== 'thumbnail')

	let distinctAttributes = [
		...priorityOrder.filter(key => rawAttributes.includes(key)),
		...rawAttributes.filter(key => !priorityOrder.includes(key)).sort()
	]
	let headerRow = `<th></th>` + distinctAttributes.map(key => `<th>${key}</th>`).join('')
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
				if (cleanKey === 'thumbnail') {
					tooltipText.thumbnail = cleanValue
				}
				if (cleanKey === 'description') {
					tooltipText.description = cleanValue
				}
				//
				else {
					outfitAttributes.set(cleanKey, cleanValue)
				}
			}
		})
		// assemble row cell blocks according to distinct attributes order
		let dataCells = distinctAttributes.map(key => {
			let value = outfitAttributes.has(key) ? outfitAttributes.get(key) : '-'
			// handle attributes that exist as a bool and without a value
			if (outfitAttributes.has(key) && value === ``) {
				value = `Yes`
			}
			//
			return `<td>${value}</td>`
		}).join('')
		let nameCell = tooltipText
			? `<td description="${(`${tooltipText.thumbnail || ''}\n\n${tooltipText.description || ''}`).trim().replace(/"/g, `&quot;`)}"><b>${outfitName}</b></td>`
			: `<td><b>${outfitName}</b></td>`
		return `<tr>${nameCell}${dataCells}</tr>`
		//
	}).join(``)
	document.getElementById(`contentTables`).innerHTML = `
		<table class="data-table">
			<thead>
				<tr>${headerRow}</tr>
			</thead>
			<tbody>
				${bodyRows}
			</tbody>
		</table>
	`
}

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
			while(stack.length && stack.at(-1).indent >= indent) {
				stack.pop() // remove the most recently stacked node since its indent is too deep to be the parent of the current line
			} // ensure the stack's top node has an indent smaller than the current line so we attach the node to the correct parent
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