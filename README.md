
# Display ClinVar variants in HiGlass

![ClinVar](https://aveit.s3.amazonaws.com/higlass/static/higlass-clinvar-screenshot.png)


**Note**: This is the source code for the ClinVar track only! You might want to check out the following repositories as well:

- HiGlass viewer: https://github.com/higlass/higlass
- HiGlass server: https://github.com/higlass/higlass-server
- HiGlass docker: https://github.com/higlass/higlass-docker

## Installation
 
```
npm install higlass-clinvar
```

## Data preparation

In order to bring a ClinVar vcf file (https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/) into the required BED format, the following script can be used (make sure to adjust the file names in the script). A chrom sizes file is required.
```
python /scripts/extract_clinvar_data.py
```

The resulting bed file can be aggregated and ingested into a HiGlass server in the usual way:
```
clodius aggregate bedfile --chromsizes-filename hg38.txt --delimiter $'\t' --importance-column 6 --max-per-tile 80 clinvar_20200824.bed 

python manage.py ingest_tileset --filename data/clinvar_20200824.beddb --filetype beddb --datatype bedlike --uid clinvar_20200824

```

## Usage

The live script can be found at:

- https://unpkg.com/higlass-clinvar/dist/higlass-clinvar.js

### Client

1. Load this track before the HiGlass core script. For example:

```
<script src="/higlass-clinvar.js"></script>
<script src="hglib.js"></script>

<script>
  ...
</script>
```

### Options
The following options are available:
```
{
  "server": "http://localhost:8001/api/v1",
  "tilesetUid": "awesome_orthologs",
  "uid": "awesome_orthologs_uid",
  "type": "horizontal-orthologs",
  "options": {
    "fontSize": 10,
    "fontFamily": "Arial",
    "labelTextColor": "#888888",
    "levelDistance": 20, // Detemines how far the different levels are visually apart
    "significanceColors": {
      "pathogenic": "#ff0000",
      "pathogenic_likely_pathogenic": "#ff3838",
      "likely_pathogenic": "#a80000",
      "uncertain_significance": "#808080",
      "likely_benign": "#009600",
      "benign_likely_benign": "#00c900",
      "benign": "#00ff00",
      "risk_factor": "#999999",
    },
  },
  "width": 768,
  "height": 200
}
```

### ECMAScript Modules (ESM)

We also build out ES modules for usage by applications who may need to import or use `higlass-clinvar` as a component.

Whenever there is a statement such as the following, assuming `higlass-clinvar` is in your node_modules folder:
```javascript
import { ClinvarTrack } from 'higlass-clinvar';
```

Then ClinvarTrack would automatically be imported from the `./es` directory (set via package.json's `"module"` value). 

## Support

For questions, please either open an issue or ask on the HiGlass Slack channel at http://bit.ly/higlass-slack

## Development

### Testing

To run the test suite:

```
npm run test-watch
```

### Installation

```bash
$ git clone https://github.com/higlass/higlass-clinvar.git
$ cd higlass-clinvar
$ npm install
```
If you have a local copy of higlass, you can then run this command in the higlass-clinvar directory:

```bash
npm link higlass
```

### Commands

 - **Developmental server**: `npm start`
 - **Production build**: `npm run build`

