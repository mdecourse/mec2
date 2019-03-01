/**
 * mec.view (c) 2018 Stefan Goessner
 * @license MIT License
 * @requires mec.core.js
 * @requires mec.node.js
 * @requires mec.constraint.js
 * @requires mec.model.js
 * @requires g2.js
 */
"use strict";

/**
 * @method
 * @param {object} - plain javascript view object.
 * @property {string} id - view id.
 * @property {string} type - view type ['vector','trace','info'].
 */
mec.view = {
    extend(view) {
        if (view.as && mec.view[view.as]) {
            Object.setPrototypeOf(view, mec.view[view.as]);
            view.constructor();
        }
        return view;
    }
}

/**
 * @param {object} - point view.
 * @property {string} show - kind of property to show as point.
 * @property {string} of - element property belongs to.
 */
mec.view.point = {
    constructor() {}, // always parameterless .. !
    /**
     * Check point view properties for validity.
     * @method
     * @param {number} idx - index in views array.
     * @returns {boolean} false - if no error / warning was detected.
     */
    validate(idx) {
        if (this.of === undefined)
            return { mid:'E_ELEM_MISSING',elemtype:'view as point',id:this.id,idx,reftype:'element',name:'of'};
        if (!this.model.elementById(this.of))
            return { mid:'E_ELEM_INVALID_REF',elemtype:'view as point',id:this.id,idx,reftype:'element',name:this.of};
        else
            this.of = this.model.elementById(this.of);

        if (this.show && !(this.show in this.of))
            return { mid:'E_ALY_PROP_INVALID',elemtype:'view as point',id:this.id,idx,reftype:this.of,name:this.show};

        return false;
    },
    /**
     * Initialize view. Multiple initialization allowed.
     * @method
     * @param {object} model - model parent.
     * @param {number} idx - index in views array.
     */
    init(model,idx) {
        this.model = model;
        this.model.notifyValid(this.validate(idx));
        this.p = Object.assign({},this.of[this.show]);
        this.p.r = this.r;
    },
    dependsOn(elem) {
        return this.of === elem || this.ref === elem;
    },
    reset() {
        Object.assign(this.p,this.of[this.show]);
    },
    post() {
        Object.assign(this.p,this.of[this.show]);
    },
    asJSON() {
        return '{ "show":"'+this.show+'","of":"'+this.of.id+'","as":"point" }';
    },
    // interaction
    get r() { return 6; },
    get isSolid() { return true },
    get sh() { return this.state & g2.OVER ? [0, 0, 10, this.model.env.show.hoveredElmColor] : false; },
    hitInner({x,y,eps}) {
        return g2.isPntInCir({x,y},this.p,eps);
    },
    g2() {
        return this.g2cache
            || (this.g2cache = g2().beg({x:()=>this.p.x,y:()=>this.p.y,sh:()=>this.sh})
                                     .cir({r:6,fs:'snow'})
                                     .cir({r:2.5,fs:'@ls',ls:'transparent'})
                                   .end());
    },
    draw(g) { g.ins(this); },
}

/**
 * @param {object} - vector view.
 * @property {string} show - kind of property to show as vector.
 * @property {string} of - element property belongs to.
 * @property {string} [at] - node id as anchor to show vector at.
 */
mec.view.vector = {
    constructor() {}, // always parameterless .. !
    /**
     * Check vector view properties for validity.
     * @method
     * @param {number} idx - index in views array.
     * @returns {boolean} false - if no error / warning was detected.
     */
    validate(idx) {
        if (this.show === undefined)
            return { mid:'E_SHOW_PROP_MISSING',elemtype:'view as vector',id:this.id,idx,name:'show'};
        if (this.of === undefined)
            return { mid:'E_ELEM_REF_MISSING',elemtype:'view as vector',id:this.id,idx,reftype:'node',name:'of'};
        if (!this.model.elementById(this.of))
            return { mid:'E_ELEM_INVALID_REF',elemtype:'view as vector',id:this.id,idx,reftype:'node',name:this.of};
        else
            this.of = this.model.elementById(this.of);

        if (this.at === undefined) {
            if ('pos' in this.of)
                Object.defineProperty(this, 'anchor', { get: () => this.of['pos'], enumerable:true, configurable:true });
            else
                return { mid:'E_SHOW_VEC_ANCHOR_MISSING',elemtype:'view as vector',id:this.id,idx,name:'at' };
        }
        else {
            if (this.model.nodeById(this.at)) {
                let at = this.model.nodeById(this.at);
                Object.defineProperty(this, 'anchor', { get: () => at['pos'], enumerable:true, configurable:true });
            }
            else if (this.at in this.of)
                Object.defineProperty(this, 'anchor', { get: () => this.of[this.at], enumerable:true, configurable:true });
            else
                return { mid:'E_SHOW_VEC_ANCHOR_INVALID',elemtype:'view as vector',id:this.id,idx,name:'at' };
        }

        return false;
    },
    /**
     * Initialize view. Multiple initialization allowed.
     * @method
     * @param {object} model - model parent.
     * @param {number} idx - index in views array.
     */
    init(model,idx) {
        this.model = model;
        this.model.notifyValid(this.validate(idx));
        this.p = Object.assign({},this.anchor);
        this.v = Object.assign({},this.of[this.show]);
    },
    dependsOn(elem) {
        return this.of === elem || this.at === elem;
    },
    update() {
        Object.assign(this.p,this.anchor);
        Object.assign(this.v,this.of[this.show]);
        const vabs = Math.hypot(this.v.y,this.v.x);
        const vview = !mec.isEps(vabs,0.5)
                    ? mec.asympClamp(mec.aly[this.show].drwscl*vabs,25,100)
                    : 0;
        this.v.x *= vview/vabs;
        this.v.y *= vview/vabs;
    },
    reset() { this.update(); },
    post() {  this.update(); },
    asJSON() {
        return '{ "show":"'+this.show+'","of":"'+this.of.id+'","as":"vector" }';
    },
    // interaction
    get isSolid() { return false },
    get sh() { return this.state & g2.OVER ? [0, 0, 10, this.model.env.show.hoveredElmColor] : false; },
    hitContour({x,y,eps}) {
        const p = this.p, v = this.v;
        return g2.isPntOnLin({x,y},p,{x:p.x+v.x,y:p.y+v.y},eps);
    },
    g2() {
        return this.g2cache
            || (this.g2cache = g2().vec({x1:()=>this.p.x,
                                         y1:()=>this.p.y,
                                         x2:()=>this.p.x+this.v.x,
                                         y2:()=>this.p.y+this.v.y,
                                         ls:this.model.env.show[this.show+'VecColor'],
                                         lw:1.5,
                                         sh:this.sh
        }));
    },
    draw(g) { g.ins(this); },
}

/**
 * @param {object} - trace view.
 * @property {string} show - kind of property to show as trace.
 * @property {string} of - element property belongs to.
 * @property {string} ref - reference constraint id.
 * @property {string} [mode='dynamic'] - ['static','dynamic','preview'].
 * @property {string} [p] - node id to trace ... (deprecated .. use 'show':'pos' now!)
 * @property {number} [t0=0] - trace begin [s].
 * @property {number} [Dt=1] - trace duration [s].
 * @property {string} [stroke='navy'] - stroke web color.
 * @property {string} [fill='transparent'] - fill web color.
 */
mec.view.trace = {
    constructor() {
        this.pts = [];  // allocate array
    },
    /**
     * Check trace view properties for validity.
     * @method
     * @param {number} idx - index in views array.
     * @returns {boolean} false - if no error / warning was detected.
     */
    validate(idx) {
        if (this.of === undefined)
            return { mid:'E_ELEM_MISSING',elemtype:'view as trace',id:this.id,idx,reftype:'element',name:'of'};
        if (!this.model.elementById(this.of))
            return { mid:'E_ELEM_INVALID_REF',elemtype:'view as trace',id:this.id,idx,reftype:'element',name:this.of};
        else
            this.of = this.model.elementById(this.of);

        if (this.show && !(this.show in this.of))
            return { mid:'E_ALY_INVALID_PROP',elemtype:'view as trace',id:this.id,idx,reftype:this.of,name:this.show};

        if (this.ref && !this.model.constraintById(this.ref))
            return { mid:'E_ELEM_INVALID_REF',elemtype:'view as trace',id:this.id,idx,reftype:'constraint',name:this.ref};
        else
            this.ref = this.model.constraintById(this.ref);

        // (deprecated !)
        if (this.p) {
            if (!this.model.nodeById(this.p))
                return { mid:'E_ELEM_INVALID_REF',elemtype:'trace',id:this.id,idx,reftype:'node',name:this.p};
            else {
                this.show = 'pos';
                this.of = this.model.nodeById(this.p);
            }
        }

        return false;
    },
    /**
     * Initialize view. Multiple initialization allowed.
     * @method
     * @param {object} model - model parent.
     * @param {number} idx - index in views array.
     */
    init(model,idx) {
        this.model = model;
        if (!this.model.notifyValid(this.validate(idx)))
            return;

        this.t0 = this.t0 || 0;
        this.Dt = this.Dt || 1;
        this.mode = this.mode || 'dynamic';
        this.pts.length = 0;  // clear points array ...
    },
    dependsOn(elem) {
        return this.of === elem
            || this.ref === elem
            || this.p === elem;  // deprecated !!
    },
    addPoint() {
        const t = this.model.timer.t,
              pnt = this.of[this.show],
              sw = this.ref ? Math.sin(this.ref.w) : 0,      // transform to ..
              cw = this.ref ? Math.cos(this.ref.w) : 1,      // reference system, i.e ...
              xp = pnt.x - (this.ref ? this.ref.p1.x : 0),   // `ref.p1` as origin ...
              yp = pnt.y - (this.ref ? this.ref.p1.y : 0),
              p = {x:cw*xp+sw*yp,y:-sw*xp+cw*yp};
//console.log("wref="+this.wref)
        if (this.mode === 'static' || this.mode === 'preview') {
            if (this.t0 <= t && t <= this.t0 + this.Dt)
                this.pts.push(p);
        }
        else if (this.mode === 'dynamic') {
            if (this.t0 < t)
                this.pts.push(p);
            if (this.t0 + this.Dt < t)
                this.pts.shift();
        }
    },
    preview() {
        if (this.mode === 'preview' && this.model.valid)
            this.addPoint();
    },
    reset(preview) {
        if (preview || this.mode !== 'preview')
            this.pts.length = 0;
    },
    post(dt) {  // add model.timer.t to parameter list .. or use timer as parameter everywhere !
        if (this.mode !== 'preview' && this.model.valid)
            this.addPoint();
    },
    asJSON() {
        return '{ "show":"'+this.show+'"as":"'+this.as
                + (this.ref ? ',"ref":'+this.ref.id : '')
                + (this.mode !== 'dynamic' ? ',"mode":"'+this.mode+'"' : '')
                + (this.id ? ',"id":"'+this.id+'"' : '')
                + (this.Dt !== 1 ? ',"Dt":'+this.Dt : '')
                + (this.stroke && !(this.stroke === 'navy') ? ',"stroke":"'+this.stroke+'"' : '')
                + (this.fill && !(this.stroke === 'transparent') ? ',"fill":"'+this.fill+'"' : '')
                + ' }';
    },
    // interaction
    get isSolid() { return false },
    get sh() { return this.state & g2.OVER ? [0, 0, 10, this.model.env.show.hoveredElmColor] : false; },
    hitContour({x,y,eps}) {
        return false;
    },
    g2() {
        return this.g2cache
           || (this.g2cache = g2().ply({pts: this.pts,
                                        format: '{x,y}',
                                        x: this.ref ? ()=>this.ref.p1.x : 0,
                                        y: this.ref ? ()=>this.ref.p1.y : 0,
                                        w: this.ref ? ()=>this.ref.w : 0,
                                        ls: this.stroke || 'navy',
                                        lw: 1.5,
                                        fs: this.fill || 'transparent',
                                        sh: ()=>this.sh
        }));
    },
    draw(g) { g.ins(this); },
}

/**
 * @param {object} - info view.
 * @property {string} show - kind of property to show as info.
 * @property {string} of - element, the property belongs to.
 */
mec.view.info = {
    constructor() {}, // always parameterless .. !
    /**
     * Check info view properties for validity.
     * @method
     * @param {number} idx - index in views array.
     * @returns {boolean} false - if no error / warning was detected.
     */
    validate(idx) {
        if (this.of === undefined)
            return { mid:'E_ELEM_MISSING',elemtype:'view as info',id:this.id,idx,reftype:'element',name:'of'};
        if (!this.model.elementById(this.of))
            return { mid:'E_ELEM_INVALID_REF',elemtype:'view as info',id:this.id,idx,reftype:'element',name:this.of};
        else
            this.of = this.model.elementById(this.of);

        if (this.show && !(this.show in this.of))
            return { mid:'E_ALY_PROP_INVALID',elemtype:'view as infot',id:this.id,idx,reftype:this.of,name:this.show};

        return false;
    },
    /**
     * Initialize view. Multiple initialization allowed.
     * @method
     * @param {object} model - model parent.
     * @param {number} idx - index in views array.
     */
    init(model,idx) {
        this.model = model;
        this.model.notifyValid(this.validate(idx));
    },
    dependsOn(elem) {
        return this.of === elem;
    },
    reset() {},
    asJSON() {
        return '{ "id":"'+ this.id + '"'
                + ',"show":"'+this.show+'"'
                + ',"of":"'+this.of.id+'"'
                + ',"as":"info"'
                + ' }';
    },
    get hasInfo() {
        return this.of.state === g2.OVER;  // exclude: OVER & DRAG
    },
    infoString() {
        if (this.show in this.of) {
            const val = this.of[this.show];
            const aly = mec.aly[this.name || this.show];
            const type = aly.type;
            const nodescl = (this.of.type === 'node' && this.model.env.show.nodeScaling) ? 1.5 : 1;
            const usrval = q => (q*aly.scl/nodescl).toPrecision(3);

            return (aly.name||this.show) + ': '
                 + (type === 'vec' ? '{x:' + usrval(val.x)+',y:' + usrval(val.y)+'}'
                                   : usrval(val))
                 + ' ' + aly.unit;
        }
        return '?';
    },
    draw(g) {}
}

/**
 * @param {object} - chart view.
 * @property {string} [mode='dynamic'] - ['static','dynamic','preview'].
 * @property {number} [t0=0] - trace begin [s].
 * @property {number} [Dt=1] - trace duration [s].
 * @property {number} [x=0] - x-position.
 * @property {number} [y=0] - y-position.
 * @property {number} [h=100] - height of chart area.
 * @property {number} [b=150] - breadth / width of chart area.
 *
 * @property {object} [xaxis] - definition of xaxis.
 * @property {object | array} [yaxis] - definition of yaxis (potentially multiple).
 *
 * @property {string} show - kind of property to show on axis.
 * @property {string} of - element property belongs to.
 */
mec.view.chart = {
    constructor() {}, // always parameterless .. !
    /**
     * Check vector view properties for validity.
     * @method
     * @param {number} idx - index in views array.
     * @returns {boolean} false - if no error / warning was detected.
     */
    validate(idx) {
        const def = {elemtype: 'view as chart', id: this.id, idx};
        const y = Array.isArray(this.yaxis) ? this.yaxis : [this.yaxis];
        const x = this.xaxis;
        if (x.of === undefined)
            return { mid: 'E_ELEM_MISSING', ...def, reftype: 'element', name:'of in xaxis' };
        if (y.some(e => e.of === undefined))
            return { mid: 'E_ELEM_MISSING', ...def, reftype: 'element', name:'of in yaxis'};

        const xelem = this.model.elementById(x.of) || this.model[x.of];
        const yelem = y.map(e => this.model.elementById(e.of) || this.model[e.of]);

        if(!xelem)
            return { mid:'E_ELEM_INVALID_REF',...def, reftype: 'element', name: this.xaxis.of };
        // else this.xaxis.of = this.model.elementById(this.xaxis.of);
        y.forEach(e => {
            if(!yelem)
                return { mid: 'E_ELEM_INVALID_REF', ...def, reftype: 'element', name: this.xaxis.of };
        });

        if (x.show && !(x.show in xelem))
            return { mid: 'E_ALY_INVALID_PROP', ...def, reftype: x.of, name: x.show };
        y.forEach(e => {
            if(e.show && !(e.show in yelem))
                return { mid: 'E_ALY_INVALID_PROP', ...def, reftype: e.of, name: e.show};
        });

        return false;
    },
    // Get element a. a might be an element of the model, or a timer
    elem(a) {
        const ret = this.model.elementById(a.of) || this.model[a.of] || undefined;
        // Get the corresponding property from a to show on the graph
        return ret ? ret[a.show] : undefined;
    },
    // Check the mec.core.aly object for analysing parameters
    aly(val) {
        return mec.aly[val.show]
        // If it does not exist, take a normalized template
            || { get scl() { return 1}, type:'num', name:val.show, unit:val.unit || '' };
    },
    title(t) {
        return t.map((a) => a.of + '.' + a.show + ' (' + a.aly.unit + ') ').join(' / ');
    },
    /**
     * Initialize view. Multiple initialization allowed.
     * @method
     * @param {object} model - model parent.
     * @param {number} idx - index in views array.
     */
    init(model, idx) {
        this.model = model;
        this.mode = this.mode || 'static';
        if (!this.model.notifyValid(this.validate(idx))) {
            return;
        }
        // Create a copy of xaxis propety and append aly property to created object for later use
        const x = Object.assign(this.xaxis, {aly: this.aly(this.xaxis)});
        // If yaxis is passed as object, put it in an array for uniform processing, then add aly
        const y = Array.isArray(this.yaxis) ? this.yaxis : [this.yaxis];
        y.forEach((a) => a.aly = this.aly(a));
        this.t0 = this.t0 || 0;
        this.Dt = this.Dt || (this.mode === 'dynamic' ? 0 : 1);
        // Create a graph as a baseline for later modification
        this.graph       = Object.assign({x:0 ,y:0, funcs: []},this);
        this.graph.xaxis = Object.assign({title:this.title([x]),grid:true,origin:true}, this.xaxis);
        this.graph.yaxis = Object.assign({title:this.title( y ),grid:true,origin:true}, this.yaxis);
        this.data = {
            // Return the current value for x translated to its corresponding scl, defined in aly
            x: () => x.aly.scl * this.elem(this.xaxis),
            // This has to be done for each y value, so it is an array of those functions
            y: y.map((e,idx) => {
                this.graph.funcs[idx] = {data:[]};
                return () => e.aly.scl * this.elem(e);
            })
        };
    },
    dependsOn(elem) {
        return this.yaxis.some(y => y.of === elem) || this.xaxis.of === elem;
    },
    addPoint() {
        const g = this.graph;
        const t = this.model.timer.t;
        // Add one point into each funcs array of graph
        const addPoints = () => this.data.y.forEach((y,idx) => g.funcs[idx].data.push(this.data.x(),y()));
        if (this.mode === 'static' || this.mode === 'preview') {
            if (this.t0 <= t && t <= this.t0 + this.Dt) {
                    addPoints();
            }
        }
        else if (this.mode === 'dynamic') {
            if (this.t0 < t) {
                    addPoints();
            }
            if (this.Dt && this.t0 + this.Dt < t) {
                for (const e of g.funcs) {
                    // Remove last Point of funcs array
                    e.data.shift(); e.data.shift();
                }
            }
        }
        // Redundant when g2.chart gets respective update ...
        [g.xmin, g.xmax, g.ymin, g.ymax] = [];
    },
    preview() {
        if (this.mode === 'preview')
            this.addPoint();
    },
    reset(preview) {
        if (this.graph && preview || this.mode !== 'preview')
                this.graph.funcs.forEach((d) => d.data = []);
    },
    post() {
        if (this.mode !== 'preview') {
            this.addPoint();
        }
        // mode is preview and preview was already rendered once
        else if (this.graph.xAxis) {
            const g = this.graph;
            this.data.y.forEach((_y,idx) => {
                const x = this.data.x();
                const y = _y();
                // Hide nods if they are out of bounds
                const scl =Number(!(x<g.xmin||x>g.xmax||y<g.ymin||y>g.ymax));
                this.nods[idx] = {...this.graph.pntOf({x, y}), scl};
            });
        }
    },
    asJSON() {
        return JSON.stringify({
            as: this.as,
            id: this.id,
            x: this.x,
            y: this.y,
            t0: this.t0,
            Dt: this.Dt,
            xaxis: this.xaxis,
            yaxis: this.yaxis
        }).replace('"yaxis"', '\n"yaxis"');
    },
    draw(g) {
        g.chart(this.graph);
        if (this.mode === 'preview') {
            const n = this.nods = [];
            this.graph.funcs.forEach((_,i) => {
                    // create references for later modification
                    n.push({x:0,y:0,scl:0});
                    g.nod({
                        x: () => n[i].x,
                        y: () => n[i].y,
                        scl: () => n[i].scl
                    })
                }
            );
        }
        return g;
    }
}
