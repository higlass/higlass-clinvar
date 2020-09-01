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

describe("Clinvar test", () => {
  const fetchMockHelper = new FetchMockHelper("", "ClinvarTest");

  beforeAll(async () => {
    await fetchMockHelper.activateFetchMock();
  });

  describe("Test that the data is correct", () => {
    let hgc = null;
    let div = null;

    beforeAll((done) => {
      [div, hgc] = mountHGComponent(div, hgc, viewConf, done);
    });

    it("Test label data", (done) => {

      const trackObj = getTrackObjectFromHGC(
        hgc.instance(),
        viewConf.views[0].uid,
        viewConf.views[0].tracks.top[0].uid
      );

      const sigLevels = trackObj.significanceLevels;
      expect(Object.keys(sigLevels).length).to.equal(9);

      done();
    });

    it("Test clinvar data", (done) => {

      // We need to wait for Ensemble data
      setTimeout(() => {
        const trackObj = getTrackObjectFromHGC(
          hgc.instance(),
          viewConf.views[0].uid,
          viewConf.views[0].tracks.top[0].uid
        );
  
        const tile = trackObj.visibleAndFetchedTiles()[0];

        const rects = tile.rectsForMouseOver;
        console.log(rects[0])
        const data = rects[0].data;

        expect(data.chrom).to.equal('chr1');
        expect(data.posRel).to.equal(2027636);
        expect(data.ref).to.equal("A");
        expect(data.alt).to.equal("C");
        expect(data.significance).to.equal("risk_factor");

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
