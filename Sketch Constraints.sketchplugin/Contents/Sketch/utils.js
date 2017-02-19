//--------------------------------------//
//               Context                //
//--------------------------------------//

var app = NSApplication.sharedApplication(),
    selection,
    plugin,
    command,
    doc,
    page,
    artboard,
    resourcesPath = "constraints@2x.png",
    constraintsKey = "@constraints"

function initContext(context) {
    doc = context.document,
        plugin = context.plugin,
        command = context.command,
        page = doc.currentPage(),
        artboard = page.currentArtboard(),
        selection = context.selection
}

//--------------------------------------//
//               Warnings               //
//--------------------------------------//

function error(selection, currentLayer, artboard) {
    if (!currentLayer) {
        showMessage("📏 No layers selected.")
        return true
    } else if (selection.count() > 1) {
        showMessage("📏 You can only select one layer.")
        return true
    } else if (!artboard) {
        showMessage("📏 The layer has to be in an artboard.")
        return true
    } else if (is.artboard(currentLayer)) {
        showMessage("📏 You can't put constraints on artboards.")
        return true
    }
}

//--------------------------------------//
//                  JS                  //
//--------------------------------------//

function exists(el) {
    var value = false
    if (typeof el !== "undefined" && el !== null) {
        value = true
    }

    return value
}

//--------------------------------------//
//                Layers                //
//--------------------------------------//

function loopThrough(layerLoop, callback) {
    while (layer = layerLoop.nextObject()) {
        if (is.group(layer)) {
            var layers = layer.layers(),
                layersInsideLoop = layers.objectEnumerator()
            loopThrough(layersInsideLoop, callback)
        } else {
            callback(layer)
        }
    }
}

//--------------------------------------//
//             Layer Types              //
//--------------------------------------//

var is = {
    it: function (layer, layerClass) {
        return layer.class() === layerClass
    },
    page : function (layer) {
        return is.it(layer, MSPage)
    },
    artboard : function (layer) {
        return is.it(layer, MSArtboardGroup)
    },
    group : function (layer) {
        return is.it(layer, MSLayerGroup)
    },
    text : function (layer) {
        return is.it(layer, MSTextLayer)
    },
    shape : function (layer) {
        return is.it(layer, MSShapeGroup)
    }
}

//--------------------------------------//
//             Constraints              //
//--------------------------------------//

function updateConstraintsForLayer(layer, content) {
    var formattedContent = JSON.stringify(content, null, "\t")
    command.setValue_forKey_onLayer(formattedContent, constraintsKey, layer)
}

//--------------------------------------//
//          Get Size & Position         //
//--------------------------------------//

var getSize = {
    width : function(layer) {
        return layer.frame().width()
    },
    widthProportion : function(layer) {
        return layer.frame().width()/layer.parentGroup().frame().width()
    },
    height : function(layer) {
        return layer.frame().height()
    },
    heightProportion : function(layer) {
        return layer.frame().height()/layer.parentGroup().frame().height()
    },
}

var getPosition = {
    top : function (layer) {
        return layer.frame().y()
    },
    left : function (layer) {
        return layer.frame().x()
    },
    right : function (layer) {
        return layer.parentGroup().frame().width() - layer.frame().x() - layer.frame().width()
    },
    bottom : function (layer) {
        return layer.parentGroup().frame().height() - layer.frame().y() - layer.frame().height()
    }
}

//--------------------------------------//
//                Layout                //
//--------------------------------------//

var layout = {
    alignHorizontally : function(layer) {
        layer.frame().setMidX(layer.parentGroup().frame().width() / 2)
    },
    alignVertically : function(layer) {
        layer.frame().setMidY(layer.parentGroup().frame().height() / 2)
    },
    setTop : function(layer, constraint) {
        layer.frame().setY(constraint)
    },
    setRight : function(layer, constraint, oppositeConstraint, size) {
        if (exists(size) && exists(constraint) && exists(oppositeConstraint)) return
        else if (exists(oppositeConstraint)) {
            layer.frame().setWidth(Math.round(layer.parentGroup().frame().width()) - constraint - Math.round(layer.frame().x()))
        } else {
            layer.frame().setX(Math.round(layer.parentGroup().frame().width()) - constraint - Math.round(layer.frame().width()))
        }
    },
    setBottom : function(layer, constraint, oppositeConstraint, size) {
        if (exists(size) && exists(constraint) && exists(oppositeConstraint)) return
        else if (exists(oppositeConstraint)) {
            layer.frame().setHeight(Math.round(layer.parentGroup().frame().height()) - constraint - Math.round(layer.frame().y()))
        } else {
            layer.frame().setY(Math.round(layer.parentGroup().frame().height()) - constraint - Math.round(layer.frame().height()))
        }
    },
    setLeft : function(layer, constraint) {
        layer.frame().setX(constraint)
    },
    setWidth : function(layer, constraint) {
        layer.frame().setWidth(constraint)
    },
    setHeight : function(layer, constraint) {
        layer.frame().setHeight(constraint)
    },
    setWidthProportion : function(layer, constraint) {
        var parentWidth = layer.parentGroup().frame().width()
        var propWidth   = (Number(constraint)*parentWidth/100)
        layer.frame().setWidth(propWidth)
    },
    setHeightProportion : function(layer, constraint) {
        var parentHeight = layer.parentGroup().frame().height()
        var propHeight   = (Number(constraint)*parentHeight/100)
        layer.frame().setHeight(propHeight)
    },
    update : function(layer, constraints) {
        if (exists(constraints.width)) layout.setWidth(layer, constraints.width)
        if (exists(constraints.widthProportion)) layout.setWidthProportion(layer, constraints.widthProportion)
        if (exists(constraints.height)) layout.setHeight(layer, constraints.height)
        if (exists(constraints.heightProportion)) layout.setHeightProportion(layer, constraints.heightProportion)
        if (exists(constraints.top)) layout.setTop(layer, constraints.top)
        if (exists(constraints.left)) layout.setLeft(layer, constraints.left)
        if (exists(constraints.bottom)) layout.setBottom(layer, constraints.bottom, constraints.top, constraints.height)
        if (exists(constraints.right)) layout.setRight(layer, constraints.right, constraints.left, constraints.width)
        if (is.text(layer)) layer.adjustFrameToFit()
        if (constraints.horizontally && !constraints.right && !constraints.left) layout.alignHorizontally(layer)
        if (constraints.vertically && !constraints.top && !constraints.bottom) layout.alignVertically(layer)
    }
}

function processLayer(layer, constraints) {
    if (exists(constraints)) layout.update(layer, constraints)
}

//--------------------------------------//
//               Sketch UI              //
//--------------------------------------//

function showMessage(message) {
    doc.showMessage(message)
}

function displayDialog(message, title) {
    if (title) {
        app.displayDialog(message).withTitle(title)
    } else {
        app.displayDialog(message)
    }
}

//--------------------------------------//
//                Inputs                //
//--------------------------------------//

function fillInputs(constraintsLayerContent, inputs) {
    var constraints = constraintsLayerContent
    inputs[0].setState((exists(constraints.width)) ? NSOnState : NSOffState)
    inputs[2].setState((exists(constraints.height)) ? NSOnState : NSOffState)
    inputs[4].setState((constraints.horizontally) ? NSOnState : NSOffState)
    inputs[5].setState((constraints.vertically) ? NSOnState : NSOffState)
    inputs[6].setStringValue((exists(constraints.top)) ? constraints.top : "")
    inputs[7].setStringValue((exists(constraints.right)) ? constraints.right : "")
    inputs[8].setStringValue((exists(constraints.bottom)) ? constraints.bottom : "")
    inputs[9].setStringValue((exists(constraints.left)) ? constraints.left : "")

    if (!exists(constraints.width)) {
        inputs[0].setState((exists(constraints.widthProportion)) ? NSOnState : NSOffState)
        if (exists(constraints.widthProportion)) inputs[1].setStringValue(constraints.widthProportion)
        inputs[10].setState((exists(constraints.widthProportion)) ? NSOnState : NSOffState)
    };
    if (!exists(constraints.height)) {
        inputs[2].setState((exists(constraints.heightProportion)) ? NSOnState : NSOffState)
        if (exists(constraints.heightProportion)) inputs[3].setStringValue(constraints.heightProportion)
        inputs[11].setState((exists(constraints.heightProportion)) ? NSOnState : NSOffState)
    }

    return (exists(constraintsLayerContent))
}

function getStringValue(input) {
    var value = parseFloat(input.stringValue())

    return isNaN(value) ? null : value
}

function getStateValue(checkbox) {
    var state = Number(checkbox.state())

    return (state) ? state : null
}

//--------------------------------------//
//               Cocoa UI               //
//--------------------------------------//

function createLabel(text, fontSize, bold, frame) {
    var label = NSTextField.alloc().initWithFrame(frame)
    label.setStringValue(text)
    label.setFont((bold) ? NSFont.boldSystemFontOfSize(fontSize) : NSFont.systemFontOfSize(fontSize))
    label.setBezeled(false)
    label.setDrawsBackground(false)
    label.setEditable(false)
    label.setSelectable(false)

    return label
}

function createCheckbox(text, checked, frame) {
    checked = (checked == false) ? NSOffState : NSOnState
    var checkbox = NSButton.alloc().initWithFrame(frame)
    checkbox.setButtonType(NSSwitchButton)
    checkbox.setBezelStyle(0)
    checkbox.setTitle(text)
    checkbox.setState(checked)

    return checkbox
}

function createSelect(frame, currentValue){
    var combo = NSComboBox.alloc().initWithFrame(frame)
    combo.addItemsWithObjectValues([currentValue])

    return combo
}

function createWindow(currentLayer) {
    var alert = COSAlertWindow.new()
    alert.addButtonWithTitle("OK")
    alert.addButtonWithTitle("Cancel")
    alert.addButtonWithTitle("Remove Constraints")
    alert.setMessageText("Sketch Constraints")
    alert.setInformativeText("Set constraints on the current layer. These constraints are relative to the parent, either a group or an artboard. You can select the current value in the combo boxes.")
    alert.setIcon(NSImage.alloc().initByReferencingFile(plugin.urlForResourceNamed("icon@2x.png").path()));

    var mainView = NSView.alloc().initWithFrame(NSMakeRect(0, 0, 300, 83)),
        alignLabel = createLabel("Alignment", 12, true, NSMakeRect(0, 58, 300, 20)),
        alignHorizontallyCheckbox = createCheckbox("Align Horizontally", false, NSMakeRect(0, 31, 300, 20)),
        alignVerticallyCheckbox = createCheckbox("Align Vertically", false, NSMakeRect(0, 6, 300, 21)),
        sizeLabel = createLabel("Size", 12, true, NSMakeRect(130, 58, 300, 20)),
        widthView = NSView.alloc().initWithFrame(NSMakeRect(130, 31, 300, 20)),
        widthCheckbox = createCheckbox("Width", false, NSMakeRect(0, 0, 300, 20)),
        widthTextfield = NSTextField.alloc().initWithFrame(NSMakeRect(70, 0, 60, 20)),
        widthProportionCheckbox = createCheckbox("\%", false, NSMakeRect(135, 0, 300, 20)),
        heightView = NSView.alloc().initWithFrame(NSMakeRect(130, 8, 300, 20)),
        heightCheckbox = createCheckbox("Height", false, NSMakeRect(0, 0, 300, 20)),
        heightTextfield = NSTextField.alloc().initWithFrame(NSMakeRect(70, 0, 60, 20)),
        heightProportionCheckbox = createCheckbox("\%", false, NSMakeRect(135, 0, 300, 20)),
        constraintsLabel = createLabel("Constraints", 12, true, NSMakeRect(0, 0, 300, 20)),
        constraintsView = NSView.alloc().initWithFrame(NSMakeRect(0, 0, 300, 150)),
        imageView = NSImageView.alloc().initWithFrame(NSMakeRect(0, 0, 300, 150)),
        backgroundImage = NSImage.alloc().initByReferencingFile(plugin.urlForResourceNamed(resourcesPath).path()),
        topComboBox = createSelect(NSMakeRect(100,122,100,25), getPosition.top(currentLayer)),
        rightComboBox = createSelect(NSMakeRect(200,61,100,25), getPosition.right(currentLayer)),
        bottomComboBox = createSelect(NSMakeRect(100,1,100,25), getPosition.bottom(currentLayer)),
        leftComboBox = createSelect(NSMakeRect(3,61,100,25), getPosition.left(currentLayer))

    mainView.addSubview(alignLabel)
    mainView.addSubview(alignHorizontallyCheckbox)
    mainView.addSubview(alignVerticallyCheckbox)
    mainView.addSubview(sizeLabel)
    widthTextfield.setStringValue(getSize.width(currentLayer))
    widthView.addSubview(widthCheckbox)
    widthView.addSubview(widthTextfield)
    widthView.addSubview(widthProportionCheckbox)
    mainView.addSubview(widthView)
    heightTextfield.setStringValue(getSize.height(currentLayer))
    heightView.addSubview(heightCheckbox)
    heightView.addSubview(heightTextfield)
    heightView.addSubview(heightProportionCheckbox)
    mainView.addSubview(heightView)
    alert.addAccessoryView(mainView)
    alert.addAccessoryView(constraintsLabel)
    alert.addAccessoryView(constraintsView)
    imageView.setImage(backgroundImage)
    constraintsView.addSubview(imageView)
    constraintsView.addSubview(topComboBox)
    constraintsView.addSubview(rightComboBox)
    constraintsView.addSubview(bottomComboBox)
    constraintsView.addSubview(leftComboBox)

    alert.alert().window().setInitialFirstResponder(topComboBox);
    topComboBox.setNextKeyView(rightComboBox);
    rightComboBox.setNextKeyView(bottomComboBox);
    bottomComboBox.setNextKeyView(leftComboBox);

    var inputs = [widthCheckbox, widthTextfield, heightCheckbox, heightTextfield,
                  alignHorizontallyCheckbox, alignVerticallyCheckbox,
                  topComboBox, rightComboBox, bottomComboBox, leftComboBox,
                  widthProportionCheckbox, heightProportionCheckbox]
    return [alert, inputs]
}
