import { expect } from "chai";
import register from "higlass-register";

import FetchMockHelper from "./utils/FetchMockHelper";

import { HiGlassComponent, getTrackObjectFromHGC } from "higlass";

import {
  waitForDataLoaded,
  mountHGComponent,
  removeHGComponent,
} from "./utils/test-helpers";

import viewConf from "./view-configs/simple-track";

import ClinvarTrack from "../src/scripts/ClinvarTrack";

register({
  name: "ClinvarTrack",
  track: ClinvarTrack,
  config: ClinvarTrack.config,
});

describe("SVG export", () => {
  const fetchMockHelper = new FetchMockHelper("", "SVGExport");

  beforeAll(async () => {
    await fetchMockHelper.activateFetchMock();
  });

  describe("SVG export", () => {
    let hgc = null;
    let div = null;

    beforeAll((done) => {
      [div, hgc] = mountHGComponent(div, hgc, viewConf, done);
    });

    it("tests that the export works and the data is correct", (done) => {

      setTimeout(() => {
        hgc.instance().handleExportSVG();

        const trackObj = getTrackObjectFromHGC(
          hgc.instance(),
          viewConf.views[0].uid,
          viewConf.views[0].tracks.top[0].uid
        );
  
        const tile = trackObj.visibleAndFetchedTiles()[0];
        

        expect(tile.svgData[0].posX).to.equal(505.55494416122536);
        expect(tile.svgData[0].posY).to.equal(96.5);
        expect(tile.svgData[0].yZero).to.equal(56);
        expect(tile.svgData[0].color).to.equal('#999999');

        expect(tile.svgData[9].posX).to.equal(306.4364296378897);
        expect(tile.svgData[9].posY).to.equal(76.5);
        expect(tile.svgData[9].yZero).to.equal(56);
        expect(tile.svgData[9].color).to.equal('#009600');


        done();
      }, 2000);
      
    });

    

    afterAll(() => {
      removeHGComponent(div);
    });
  });

  afterAll(async () => {
    await fetchMockHelper.storeDataAndResetFetchMock();
  });
});
