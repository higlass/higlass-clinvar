import slugid from "slugid";

const ClinvarTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"'
    );
  }

  // Services
  const { tileProxy } = HGC.services;

  // Utils
  const { colorToHex, trackUtils, absToChr } = HGC.utils;

  class ClinvarTrackClass extends HGC.tracks.BedLikeTrack {
    constructor(context, options) {
      super(context, options);

      const { animate } = context;

      this.animate = animate;

      this.options = options;
      this.initOptions();

      this.initSignificanceLevels();

      this.offsetTop = 10;

      console.log(this.significanceLevels);
    }

    initTile(tile) {
      tile.rectGraphics = new HGC.libraries.PIXI.Graphics();
      tile.bgGraphics = new HGC.libraries.PIXI.Graphics();
      //tile.rectMaskGraphics = new HGC.libraries.PIXI.Graphics();

      tile.graphics.addChild(tile.bgGraphics);
      tile.graphics.addChild(tile.rectGraphics);
      //tile.graphics.addChild(tile.rectMaskGraphics);

      //tile.rectGraphics.mask = tile.rectMaskGraphics;
      tile.clinVarData = this.interpretFieldsData(tile.tileData);

      console.log(tile);

      tile.initialized = true;
    }

    interpretFieldsData(td){

      const clinVarData = [];

      td.forEach((ts) => {
        
        const chrom = ts.fields[0];
        const posRel = +ts.fields[1];
        const posAbs = ts.xStart;
        const ref = ts.fields[3];
        const alt = ts.fields[4];
        const goldStars = +ts.fields[5];
        const significance = ts.fields[6];
        const significanceConf = ts.fields[7];
        const variantType = ts.fields[8];
        const origin = +ts.fields[9];
        const molecularConsequence = ts.fields[10];
        const diseaseName = ts.fields[11];
        const hgvs = ts.fields[12];


        clinVarData.push()
      });

      return clinVarData;

    }

    getLabelTextSprite(str) {
      const text = new HGC.libraries.PIXI.Text(str, this.labelTextOptions);
      text.interactive = true;
      text.anchor.x = 0;
      text.anchor.y = 0;
      text.visible = true;

      const pixiSprite = new HGC.libraries.PIXI.Sprite(text.texture);
      pixiSprite.width = text.getBounds().width / 2;
      pixiSprite.height = text.getBounds().height / 2;

      return pixiSprite;
    }

    initSignificanceLevels() {
      const pathogenic = {
        offsetY: 0 * this.options.levelDistance,
        label: "Pathogenic",
        labelVisible: true,
        sprite: this.getLabelTextSprite("Pathogenic"),
      };

      const pathogenic_likely_pathogenic = {
        offsetY: 0.5 * this.options.levelDistance,
        label: "Pathogenic / Likely pathogenic",
        labelVisible: false,
        sprite: this.getLabelTextSprite("Pathogenic / Likely pathogenic"),
      };

      const likely_pathogenic = {
        offsetY: 1 * this.options.levelDistance,
        label: "Likely pathogenic",
        labelVisible: true,
        sprite: this.getLabelTextSprite("Likely pathogenic"),
      };

      const uncertain_significance = {
        offsetY: 2 * this.options.levelDistance,
        label: "Uncertain significance",
        labelVisible: true,
        sprite: this.getLabelTextSprite("Uncertain significance"),
      };

      const likely_benign = {
        offsetY: 3 * this.options.levelDistance,
        label: "Likely benign",
        labelVisible: true,
        sprite: this.getLabelTextSprite("Likely benign"),
      };

      const benign_likely_benign = {
        offsetY: 3.5 * this.options.levelDistance,
        label: "Benign / Likely benign",
        labelVisible: false,
        sprite: this.getLabelTextSprite("Benign / Likely benign"),
      };

      const benign = {
        offsetY: 4 * this.options.levelDistance,
        label: "Benign",
        labelVisible: true,
        sprite: this.getLabelTextSprite("Benign"),
      };

      const risk_factor = {
        offsetY: 4 * this.options.levelDistance,
        label: "Risk factor",
        labelVisible: false,
        sprite: this.getLabelTextSprite("Risk factor"),
      };

      const conflicting_interpretations_of_pathogenicity = {
        offsetY: null,
        label: "Conflicting interpretations of pathogenicity",
        labelVisible: false,
        sprite: this.getLabelTextSprite(
          "Conflicting interpretations of pathogenicity"
        ),
      };

      this.significanceLevels = {
        pathogenic,
        pathogenic_likely_pathogenic,
        likely_pathogenic,
        uncertain_significance,
        likely_benign,
        benign_likely_benign,
        benign,
        risk_factor,
        conflicting_interpretations_of_pathogenicity,
      };
    }

    initOptions() {
      this.fontSize = +this.options.fontSize;

      this.colors = {};
      this.colors["labelTextColor"] = colorToHex(this.options.labelTextColor);
      this.colors["black"] = colorToHex("#000000");
      this.colors["white"] = colorToHex("#ffffff");
      this.colors["lightgrey"] = colorToHex("#ededed");

      this.labelTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors["labelTextColor"],
      };
    }

    drawTile() {}

    /*
     * Redraw the track because the options
     * changed
     */
    rerender(options, force) {
      const strOptions = JSON.stringify(options);
      if (!force && strOptions === this.prevOptions) return;

      this.options = options;
      this.initOptions();

      this.prevOptions = strOptions;

      this.drawLabels();

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.renderTile(tile);
      });
    }

    // renderMask(tile) {
    //   const { tileX, tileWidth } = trackUtils.getTilePosAndDimensions(
    //     this.tilesetInfo,
    //     tile.tileId
    //   );

    //   tile.rectMaskGraphics.clear();

    //   const randomColor = Math.floor(Math.random() * 16 ** 6);
    //   tile.rectMaskGraphics.beginFill(randomColor, 0.3);

    //   const x = this._xScale(tileX);
    //   const y = 0;
    //   const width = this._xScale(tileX + tileWidth) - this._xScale(tileX);
    //   const height = this.dimensions[1];
    //   tile.rectMaskGraphics.drawRect(x, y, width, height);
    // }

    renderTile(tile) {
      if (!tile || !tile.initialized) return;

      // store the scale at while the tile was drawn at so that
      // we only resize it when redrawing
      tile.drawnAtScale = this._xScale.copy();
      tile.rectGraphics.removeChildren();
      tile.rectGraphics.clear();
      tile.bgGraphics.removeChildren();
      tile.bgGraphics.clear();

      
      this.drawTileBackground(tile);
      this.drawLollipops(tile);
      console.log(tile)
      //this.renderMask(tile);
    }

    draw() {

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.drawLollipops(tile);
      });

      //requestAnimationFrame(this.animate);
    }

    drawLollipops(tile) {
      const td = tile.tileData;

      td.forEach((ts) => {
        const pos = ts.xStart;
        //console.log(pos, ts.fields)
      });
      console.log(td.length)

      tile.rectGraphics.beginFill(this.colors["black"]);
      tile.rectGraphics.drawRect(100, 10, 100, 10);
    }

    drawTileBackground(tile) {
      
      tile.bgGraphics.beginFill(this.colors["lightgrey"]);

      Object.keys(this.significanceLevels).forEach((key) => {
        const sl = this.significanceLevels[key];
        if (!sl.labelVisible) return;

        tile.bgGraphics.drawRect(
          0,
          sl.offsetY + this.offsetTop + sl.sprite.height / 2,
          this.dimensions[0],
          1
        );
      });
    }

    drawLabels() {
      this.pForeground.clear();
      this.pForeground.removeChildren();
      let maxLabelWidth = 0;

      Object.keys(this.significanceLevels).forEach((key) => {
        const sl = this.significanceLevels[key];
        if (!sl.labelVisible) return;

        maxLabelWidth = Math.max(maxLabelWidth, sl.sprite.width);
      });

      this.pForeground.beginFill(this.colors["white"]);
      this.pForeground.drawRect(
        0,
        this.offsetTop,
        maxLabelWidth + 2,
        5 * this.options.levelDistance
      );

      Object.keys(this.significanceLevels).forEach((key) => {
        const sl = this.significanceLevels[key];
        if (!sl.labelVisible) return;
        const sprite = sl.sprite;
        sprite.position.x = 0;
        sprite.position.y = sl.offsetY + this.offsetTop;

        this.pForeground.addChild(sprite);

        // this.pForeground.drawRect(
        //   0,
        //   (i + 1) * (this.rowHeight + this.rowSpacing),
        //   this.dimensions[0],
        //   1
        // );
      });
    }

    /** cleanup */
    destroyTile(tile) {
      tile.rectGraphics.destroy();
      //tile.rectMaskGraphics.destroy();
      tile.graphics.destroy();
      tile = null;
    }

    calculateZoomLevel() {
      // offset by 2 because 1D tiles are more dense than 2D tiles
      // 1024 points per tile vs 256 for 2D tiles

      const xZoomLevel = tileProxy.calculateZoomLevel(
        this._xScale,
        this.tilesetInfo.min_pos[0],
        this.tilesetInfo.max_pos[0]
      );

      let zoomLevel = Math.min(xZoomLevel, this.maxZoom);
      zoomLevel = Math.max(zoomLevel, 0);

      return zoomLevel;
    }

    isPointInRectangle(rect, point) {
      if (
        rect[0] < point[0] &&
        rect[1] > point[0] &&
        rect[2] < point[1] &&
        rect[3] > point[1]
      ) {
        return true;
      }
      return false;
    }

    getMouseOverHtml(trackX, trackY) {
      return "";
    }

    exportSVG() {
      let track = null;
      let base = null;

      base = document.createElement("g");
      track = base;

      const clipPathId = slugid.nice();

      const gClipPath = document.createElement("g");
      gClipPath.setAttribute("style", `clip-path:url(#${clipPathId});`);

      track.appendChild(gClipPath);

      // define the clipping area as a polygon defined by the track's
      // dimensions on the canvas
      const clipPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "clipPath"
      );
      clipPath.setAttribute("id", clipPathId);
      track.appendChild(clipPath);

      const clipPolygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
      );
      clipPath.appendChild(clipPolygon);

      clipPolygon.setAttribute(
        "points",
        `${this.position[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${
            this.position[1] + this.dimensions[1]
          } ` +
          `${this.position[0]},${this.position[1] + this.dimensions[1]} `
      );

      const output = document.createElement("g");

      output.setAttribute(
        "transform",
        `translate(${this.position[0]},${this.position[1]})`
      );

      gClipPath.appendChild(output);

      return [base, base];
    }
  }
  return new ClinvarTrackClass(...args);
};

const icon =
  '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M-1-1h22v22H-1z"/><g><path stroke="#007fff" stroke-width="1.5" fill="#007fff" d="M-.667-.091h5v20.167h-5z"/><path stroke-width="1.5" stroke="#e8e500" fill="#e8e500" d="M5.667.242h5v20.167h-5z"/><path stroke-width="1.5" stroke="#ff0038" fill="#ff0038" d="M15.833.076h5v20.167h-5z"/><path stroke="green" stroke-width="1.5" fill="green" d="M10.833-.258H14.5v20.167h-3.667z"/></g></svg>';

// default
ClinvarTrack.config = {
  type: "horizontal-clinvar",
  datatype: ["bedlike"],
  local: false,
  orientation: "1d-horizontal",
  thumbnail: new DOMParser().parseFromString(icon, "text/xml").documentElement,
  availableOptions: [
    "fontSize",
    "fontFamily",
    "labelTextColor",
    "levelDistance",
  ],
  defaultOptions: {
    fontSize: 10,
    fontFamily: "Arial",
    labelTextColor: "#888888",
    levelDistance: 20,
  },
};

export default ClinvarTrack;
