import slugid from 'slugid';
import { isValidElement } from 'react';

const ClinvarTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"',
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

      this.offsetTop = 10;

      this.initSignificanceLevels();
    }

    initTile(tile) {
      tile.lollipopsGraphics = new HGC.libraries.PIXI.Graphics();
      tile.bgGraphics = new HGC.libraries.PIXI.Graphics();
      //tile.rectMaskGraphics = new HGC.libraries.PIXI.Graphics();

      tile.graphics.addChild(tile.bgGraphics);
      tile.graphics.addChild(tile.lollipopsGraphics);
      //tile.graphics.addChild(tile.rectMaskGraphics);

      //tile.rectGraphics.mask = tile.rectMaskGraphics;
      tile.clinVarData = this.interpretFieldsData(tile.tileData);
      tile.rectsForMouseOver = [];

      const bounds = this.getBoundsOfTile(tile);
      tile.tileMinX = bounds[0];
      tile.tileMaxX = bounds[1];

      tile.initialized = true;
    }

    interpretFieldsData(td) {
      const clinVarData = [];

      td.forEach((ts) => {
        const significance = ts.fields[7].replace('/', '_').toLowerCase();
        let significancesToBeDrawn = [significance];
        let numReports = [1];

        if (significance === 'conflicting_interpretations_of_pathogenicity') {
          significancesToBeDrawn = [];
          numReports = [];
          ts.fields[8].split(',').forEach((sig) => {
            const pos1 = sig.indexOf('(');
            const pos2 = sig.indexOf(')');
            significancesToBeDrawn.push(
              sig.substr(0, pos1).replace('/', '_').toLowerCase(),
            );
            numReports.push(+sig.substr(pos1 + 1, pos2 - pos1 - 1));
          });
        }

        for (var i = 0; i < significancesToBeDrawn.length; i++) {
          const entry = {
            chrom: ts.fields[0],
            posRel: +ts.fields[1],
            posAbs: ts.xStart,
            ref: ts.fields[3],
            alt: ts.fields[4],
            importance: ts.fields[5],
            goldStars: +ts.fields[6],
            significance: significance, // represents keys in this.significance
            significanceDisplay: ts.fields[7].replace(/_/g, ' '),
            significanceToBeDrawn: significancesToBeDrawn[i],
            significanceConf: ts.fields[8],
            variantType: ts.fields[9],
            origin: +ts.fields[10],
            molecularConsequence: ts.fields[11],
            diseaseName: ts.fields[12],
            hgvs: ts.fields[13],
            numReports: numReports[i], // This is the number in significanceConfs, it is 1 for not conflicting_interpretations_of_pathogenicity
            drawOrder: this.significanceLevels[significancesToBeDrawn[i]]
              .drawOrder,
            horizontalShift: 0, // will be used in case there are two reports for the same variant
          };

          clinVarData.push(entry);
        }
      });

      const clinVarDataSorted = clinVarData.sort((a, b) =>
        a.posAbs > b.posAbs ? 1 : -1,
      );
      const entriesThatPotentiallyRequireShift = {};

      clinVarDataSorted.forEach((data, index) => {
        if (index === 0) return;

        if (data.posAbs === clinVarDataSorted[index - 1].posAbs) {
          if (!entriesThatPotentiallyRequireShift[data.posAbs]) {
            entriesThatPotentiallyRequireShift[data.posAbs] = [];
            entriesThatPotentiallyRequireShift[data.posAbs].push({
              index: index - 1,
              significanceToBeDrawn:
                clinVarDataSorted[index - 1].significanceToBeDrawn,
            });
          }

          entriesThatPotentiallyRequireShift[data.posAbs].push({
            index: index,
            significanceToBeDrawn: data.significanceToBeDrawn,
          });
        }
      });

      Object.keys(entriesThatPotentiallyRequireShift).forEach((posAbs) => {
        // Group each array of object by significanceToBeDrawn
        // if they have the same posAbs but not the same significance, no shift is needed
        const grouped = entriesThatPotentiallyRequireShift[posAbs].reduce(
          function (h, obj) {
            h[obj.significanceToBeDrawn] = (
              h[obj.significanceToBeDrawn] || []
            ).concat(obj);
            return h;
          },
          {},
        );

        Object.keys(grouped).forEach((significanceToBeDrawn) => {
          const group = grouped[significanceToBeDrawn];
          if (group.length <= 1) return; // no shift required

          group.forEach((itemToShift, groupInd) => {
            clinVarDataSorted[itemToShift.index].horizontalShift = Math.trunc(
              groupInd - group.length / 2,
            );
          });
        });
      });

      clinVarData.sort((a, b) => (a.drawOrder > b.drawOrder ? 1 : -1));

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
        offsetY: 0 * this.options.levelDistance + this.offsetTop,
        label: 'Pathogenic',
        labelVisible: true,
        color: this.options.significanceColors['pathogenic'],
        colorHex: colorToHex(this.options.significanceColors['pathogenic']),
        sprite: this.getLabelTextSprite('Pathogenic'),
        drawOrder: 1,
      };

      const pathogenic_likely_pathogenic = {
        offsetY: 0.5 * this.options.levelDistance + this.offsetTop,
        label: 'Pathogenic / Likely pathogenic',
        labelVisible: false,
        color: this.options.significanceColors['pathogenic_likely_pathogenic'],
        colorHex: colorToHex(
          this.options.significanceColors['pathogenic_likely_pathogenic'],
        ),
        sprite: this.getLabelTextSprite('Pathogenic / Likely pathogenic'),
        drawOrder: 3,
      };

      const likely_pathogenic = {
        offsetY: 1 * this.options.levelDistance + this.offsetTop,
        label: 'Likely pathogenic',
        labelVisible: true,
        color: this.options.significanceColors['likely_pathogenic'],
        colorHex: colorToHex(
          this.options.significanceColors['likely_pathogenic'],
        ),
        sprite: this.getLabelTextSprite('Likely pathogenic'),
        drawOrder: 5,
      };

      const uncertain_significance = {
        offsetY: 2 * this.options.levelDistance + this.offsetTop,
        label: 'Uncertain significance',
        labelVisible: true,
        color: this.options.significanceColors['uncertain_significance'],
        colorHex: colorToHex(
          this.options.significanceColors['uncertain_significance'],
        ),
        sprite: this.getLabelTextSprite('Uncertain significance'),
        drawOrder: 7,
      };

      const likely_benign = {
        offsetY: 3 * this.options.levelDistance + this.offsetTop,
        label: 'Likely benign',
        labelVisible: true,
        color: this.options.significanceColors['likely_benign'],
        colorHex: colorToHex(this.options.significanceColors['likely_benign']),
        sprite: this.getLabelTextSprite('Likely benign'),
        drawOrder: 6,
      };

      const benign_likely_benign = {
        offsetY: 3.5 * this.options.levelDistance + this.offsetTop,
        label: 'Benign / Likely benign',
        labelVisible: false,
        color: this.options.significanceColors['benign_likely_benign'],
        colorHex: colorToHex(
          this.options.significanceColors['benign_likely_benign'],
        ),
        sprite: this.getLabelTextSprite('Benign / Likely benign'),
        drawOrder: 4,
      };

      const benign = {
        offsetY: 4 * this.options.levelDistance + this.offsetTop,
        label: 'Benign',
        labelVisible: true,
        color: this.options.significanceColors['benign'],
        colorHex: colorToHex(this.options.significanceColors['benign']),
        sprite: this.getLabelTextSprite('Benign'),
        drawOrder: 2,
      };

      const risk_factor = {
        offsetY: 4 * this.options.levelDistance + this.offsetTop,
        label: 'Risk factor',
        labelVisible: false,
        color: this.options.significanceColors['risk_factor'],
        colorHex: colorToHex(this.options.significanceColors['risk_factor']),
        sprite: this.getLabelTextSprite('Risk factor'),
        drawOrder: 0,
      };

      const conflicting_interpretations_of_pathogenicity = {
        offsetY: null,
        label: 'Conflicting interpretations of pathogenicity',
        labelVisible: false,
        color: '#0000ff',
        colorHex: colorToHex('#0000ff'),
        sprite: this.getLabelTextSprite(
          'Conflicting interpretations of pathogenicity',
        ),
        drawOrder: -1,
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
      this.colors['labelTextColor'] = colorToHex(this.options.labelTextColor);
      this.colors['black'] = colorToHex('#000000');
      this.colors['white'] = colorToHex('#ffffff');
      this.colors['lightgrey'] = colorToHex('#ededed');

      this.labelTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors['labelTextColor'],
      };
    }

    /*
     * Redraw the track because the options
     * changed
     */
    rerender(options, force) {
      const strOptions = JSON.stringify(options);
      if (!force && strOptions === this.prevOptions) return;

      this.options = options;
      this.initOptions();
      this.initSignificanceLevels();

      this.prevOptions = strOptions;

      this.drawLabels();
      this.draw();
    }

    drawTile(tile) {}

    renderTile(tile) {}

    draw() {
      this.zoomLevel = this.calculateZoomLevel();

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.drawTileBackground(tile);
        this.drawLollipops(tile);
      });

    }

    drawLollipops(tile) {
      tile.lollipopsGraphics.removeChildren();
      tile.lollipopsGraphics.clear();
      tile.lollipopsGraphics.alpha = this.zoomLevel == this.maxZoom ? 1.0 : 0.5;
      tile.rectsForMouseOver = [];
      tile.svgData = [];

      const slus = this.significanceLevels['uncertain_significance'];
      const yZero = slus.offsetY + slus.sprite.height / 2;
      const circleRadius = 4;
      const circleDiameter = 2 * circleRadius;

      tile.clinVarData.forEach((cvEntry) => {
        const sl = this.significanceLevels[cvEntry.significanceToBeDrawn];
        tile.lollipopsGraphics.beginFill(sl.colorHex);
        const posX = this._xScale(cvEntry.posAbs + 0.5); // We want to draw in the middle of a nucleatide
        const posXshifted = posX + cvEntry.horizontalShift * circleDiameter;
        const posY = sl.offsetY + sl.sprite.height / 2 + 0.5;

        tile.lollipopsGraphics.drawCircle(posXshifted, posY, circleRadius);

        tile.lollipopsGraphics.drawRect(posX - 0.5, yZero, 1, posY - yZero);

        tile.rectsForMouseOver.push({
          data: cvEntry,
          rect: [
            posXshifted - circleRadius,
            posXshifted + circleRadius,
            posY - circleRadius,
            posY + circleRadius,
          ],
        });

        tile.svgData.push({
          posX: posXshifted,
          posY: posY,
          yZero: yZero,
          color: sl.color,
        });
      });
    }

    // This should be drawn only once (and not based on tiles but the whole track)
    drawTileBackground(tile) {
      tile.bgGraphics.removeChildren();
      tile.bgGraphics.clear();

      const minX = this._xScale(tile.tileMinX);
      const maxX = this._xScale(tile.tileMaxX);

      tile.bgGraphics.beginFill(this.colors['lightgrey']);

      Object.keys(this.significanceLevels).forEach((key) => {
        const sl = this.significanceLevels[key];
        if (!sl.labelVisible) return;

        tile.bgGraphics.drawRect(
          minX,
          sl.offsetY + sl.sprite.height / 2,
          maxX - minX, //this.dimensions[0],
          1,
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

      this.pForeground.beginFill(this.colors['white']);
      this.pForeground.drawRect(
        0,
        this.offsetTop,
        maxLabelWidth + 2,
        5 * this.options.levelDistance,
      );

      Object.keys(this.significanceLevels).forEach((key) => {
        const sl = this.significanceLevels[key];
        if (!sl.labelVisible) return;
        const sprite = sl.sprite;
        sprite.position.x = 0;
        sprite.position.y = sl.offsetY;

        this.pForeground.addChild(sprite);

        // this.pForeground.drawRect(
        //   0,
        //   (i + 1) * (this.rowHeight + this.rowSpacing),
        //   this.dimensions[0],
        //   1
        // );
      });
    }

    zoomedY(yPos, kMultiplier) {}

    movedY(dY) {}

    getBoundsOfTile(tile) {
      // get the bounds of the tile
      const tileId = +tile.tileId.split('.')[1];
      const zoomLevel = +tile.tileId.split('.')[0]; //track.zoomLevel does not always seem to be up to date
      const tileWidth = +this.tilesetInfo.max_width / 2 ** zoomLevel;
      const tileMinX = this.tilesetInfo.min_pos[0] + tileId * tileWidth; // abs coordinates
      const tileMaxX = this.tilesetInfo.min_pos[0] + (tileId + 1) * tileWidth;

      return [tileMinX, tileMaxX];
    }

    /** cleanup */
    destroyTile(tile) {
      tile.bgGraphics.destroy();
      tile.lollipopsGraphics.destroy();
      tile.graphics.destroy();
      tile = null;
    }

    calculateZoomLevel() {
      // offset by 2 because 1D tiles are more dense than 2D tiles
      // 1024 points per tile vs 256 for 2D tiles
      if (!this.tilesetInfo) return;

      const xZoomLevel = tileProxy.calculateZoomLevel(
        this._xScale,
        this.tilesetInfo.min_pos[0],
        this.tilesetInfo.max_pos[0],
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
      if (!this.tilesetInfo) {
        return '';
      }

      const point = [trackX, trackY];

      for (const tile of this.visibleAndFetchedTiles()) {
        for (let i = 0; i < tile.rectsForMouseOver.length; i++) {
          const rect = tile.rectsForMouseOver[i].rect;
          const data = tile.rectsForMouseOver[i].data;
          if (this.isPointInRectangle(rect, point)) {
            let goldStarString = '';
            for (var i = 0; i < data.goldStars; i++) {
              goldStarString += "<span style='color:#ebdc00'>&#9733;</span>";
            }
            for (var i = 0; i < 4 - data.goldStars; i++) {
              goldStarString += "<span style='color:#bdbdbd'>&#9734;</span>";
            }
            const posRel = data.posRel.toLocaleString('en-US', {
              minimumFractionDigits: 0,
            });
            return `
                <div style='text-align: center'>
                  <div><b>${data.chrom}:${posRel}</b></div>
                  <div>${data.ref} &#8658; ${data.alt}</div>
                  <div>Clinvar review status: ${goldStarString}</div>
                  <div>Clinical significance: <b>${data.significanceDisplay}</b></div>
                </div>
              `;
          }
        }
      }
    }

    exportSVG() {
      let track = null;
      let base = null;

      base = document.createElement('g');
      track = base;

      const clipPathId = slugid.nice();

      const gClipPath = document.createElement('g');
      gClipPath.setAttribute('style', `clip-path:url(#${clipPathId});`);

      track.appendChild(gClipPath);

      // define the clipping area as a polygon defined by the track's
      // dimensions on the canvas
      const clipPath = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'clipPath',
      );
      clipPath.setAttribute('id', clipPathId);
      track.appendChild(clipPath);

      const clipPolygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon',
      );
      clipPath.appendChild(clipPolygon);

      clipPolygon.setAttribute(
        'points',
        `${this.position[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${
            this.position[1] + this.dimensions[1]
          } ` +
          `${this.position[0]},${this.position[1] + this.dimensions[1]} `,
      );

      const output = document.createElement('g');

      output.setAttribute(
        'transform',
        `translate(${this.position[0]},${this.position[1]})`,
      );

      gClipPath.appendChild(output);

      // Horizontal lines
      Object.keys(this.significanceLevels).forEach((sl) => {
        if (this.significanceLevels[sl].labelVisible) {
          const g = document.createElement('g');
          const t = document.createElement('line');
          t.setAttribute('x1', 0);
          t.setAttribute('x2', this.dimensions[0]);
          t.setAttribute('y1', 0);
          t.setAttribute('y2', 0);
          t.setAttribute('stroke', this.options.labelTextColor);
          t.setAttribute('stroke-width', 0.5);

          g.setAttribute('transform', `scale(1,1)`);

          const spHeight = this.significanceLevels[sl].sprite.height;

          g.appendChild(t);
          g.setAttribute(
            'transform',
            `translate(0,${
              this.significanceLevels[sl].offsetY + spHeight / 2
            })scale(1,1)`,
          );
          output.appendChild(g);
        }
      });

      // Labels
      const totalHeight = 5 * this.options.levelDistance + 5;

      let maxLabelWidth = 0;

      Object.keys(this.significanceLevels).forEach((sl) => {
        if (this.significanceLevels[sl].labelVisible) {
          maxLabelWidth = Math.max(
            maxLabelWidth,
            this.significanceLevels[sl].sprite.width,
          );
        }
      });

      // Lollipops
      this.visibleAndFetchedTiles().forEach((tile) => {
        tile.svgData.forEach((entry) => {
          const g = document.createElement('g');
          const t = document.createElement('circle');
          t.setAttribute('cx', entry.posX);
          t.setAttribute('cy', entry.posY);
          t.setAttribute('r', 4);

          g.setAttribute('transform', `scale(1,1)`);

          t.setAttribute('fill', entry.color);
          g.appendChild(t);

          const l = document.createElement('line');
          l.setAttribute('x1', entry.posX);
          l.setAttribute('x2', entry.posX);
          l.setAttribute('y1', entry.posY);
          l.setAttribute('y2', entry.yZero);
          l.setAttribute('stroke', entry.color);
          l.setAttribute('stroke-width', 1);
          g.appendChild(l);

          output.appendChild(g);
        });
      });

      const gLabelBackground = document.createElement('g');
      const rLabelBackground = document.createElement('path');
      const dLabelBackground = `M 0 0 H ${
        maxLabelWidth + 3
      } V ${totalHeight} H 0 Z`;
      rLabelBackground.setAttribute('d', dLabelBackground);
      rLabelBackground.setAttribute('fill', 'white');
      rLabelBackground.setAttribute('opacity', '1');
      gLabelBackground.appendChild(rLabelBackground);
      output.appendChild(gLabelBackground);

      Object.keys(this.significanceLevels).forEach((sl) => {
        if (this.significanceLevels[sl].labelVisible) {
          const g = document.createElement('g');
          const t = document.createElement('text');
          t.setAttribute('text-anchor', 'start');
          t.setAttribute('font-family', this.options.fontFamily);
          t.setAttribute('font-size', `${this.fontSize}px`);
          //t.setAttribute("font-weight", "bold");

          g.setAttribute('transform', `scale(1,1)`);

          t.setAttribute('fill', this.options.labelTextColor);
          t.innerHTML = this.significanceLevels[sl].label;

          g.appendChild(t);
          g.setAttribute(
            'transform',
            `translate(0,${
              this.significanceLevels[sl].offsetY + this.offsetTop
            })scale(1,1)`,
          );
          output.appendChild(g);
        }
      });

      return [base, base];
    }
  }
  return new ClinvarTrackClass(...args);
};

const icon =
  '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M-1-1h22v22H-1z"/><g><path stroke="#007fff" stroke-width="1.5" fill="#007fff" d="M-.667-.091h5v20.167h-5z"/><path stroke-width="1.5" stroke="#e8e500" fill="#e8e500" d="M5.667.242h5v20.167h-5z"/><path stroke-width="1.5" stroke="#ff0038" fill="#ff0038" d="M15.833.076h5v20.167h-5z"/><path stroke="green" stroke-width="1.5" fill="green" d="M10.833-.258H14.5v20.167h-3.667z"/></g></svg>';

// default
ClinvarTrack.config = {
  type: 'horizontal-clinvar',
  datatype: ['bedlike'],
  local: false,
  orientation: '1d-horizontal',
  thumbnail: new DOMParser().parseFromString(icon, 'text/xml').documentElement,
  availableOptions: [
    'fontSize',
    'fontFamily',
    'labelTextColor',
    'levelDistance',
    'significanceColors',
  ],
  defaultOptions: {
    fontSize: 10,
    fontFamily: 'Arial',
    labelTextColor: '#888888',
    levelDistance: 20,
    significanceColors: {
      pathogenic: '#D55E00',
      pathogenic_likely_pathogenic: '#CC79A7',
      likely_pathogenic: '#E69F00',
      uncertain_significance: '#808080',
      likely_benign: '#56B4E9',
      benign_likely_benign: '#0072B2',
      benign: '#009E73',
      risk_factor: '#999999',
    },
  },
};

export default ClinvarTrack;
