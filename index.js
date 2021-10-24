const fs = require('fs');
const axios = require("axios");
const ch = require("cheerio");
const util = require('util')

const { existsOne } = require("domutils");

let converter = require('json-2-csv');


const getPage = async (slug, pagina) => {
    let res = null;
    let pag = '';

    if (pagina === 1) {
        pag='';
    } else {
        pag = `&pagina=${pagina}`;
    }
    try {
        res = await axios.get(`https://www.milanuncios.com/${slug}/?orden=relevance&fromSearch=1${pag}`);
    } catch(e) {
        console.log(e);
    }
    return res;
};

const getPhone = async (idAd) => {
    let res = null;
    
    try {
        //res = await axios.get("https://www.milanuncios.com/datos-contacto/?usePhoneProxy=0&from=list&includeEmail=false&id=" + idAd);
        res = await axios.get("https://www.milanuncios.com/api/freespee/contact.php?adId=" + idAd);
    } catch(e) {
        console.log(e);
    }
    
    if (res.data.status != 'ok') {
        return '';
    }
    return res.data.phone;
};

const extractData = (datos) => {
    const data = [];
    datos.map((anu) => {
        const anuncio = {
            titulo: anu.title,
            link: anu.url,
            id: anu.id,
            telefono: anu.firstPhoneNumber,
        }
        
        data.push(anuncio);
    });

    return data;
}

const extractScripts = ($) => {
    const scripts = $('script').filter(function() {
        return ($(this).html().indexOf('window.__INITIAL_PROPS__ =') > -1);
    });
    
    const matches = scripts.html().match(/window.__INITIAL_PROPS__ = (.*);/);
    return eval(matches[1]);
}

const init = async (slug) => {
    let page = await getPage(slug, 1);
    let $ = ch.load(page.data);

    let data = [];

    const datos = extractScripts($);

    const pagina = datos.adListPagination.pagination.page;
    const totalPaginas = datos.adListPagination.pagination.totalPages;

    for (let x = 2; x <= totalPaginas; x++) {
        console.log(`Getting page number ${x}`);
        page = await getPage(slug, x);
        $ = ch.load(page.data);

        const datos = extractScripts($);
        data = [...data, ...extractData(datos.adListPagination.adList.ads)];
    }
    
    return data;
}

const saveToCsv = (fileName, data) => {
        
    const callback = (err, csv) => {
        if (err) throw err;
        fs.writeFileSync(`${fileName}.csv`, csv);
    }

    converter.json2csv(data, callback);

}

;(async () => {
    console.log('init');
    if (process.argv[2]) {
        const anuncios = await init(process.argv[2]);
        saveToCsv(process.argv[2], anuncios);
    } else {
        console.log('Error: Se requiere el slug');
    }
    
    console.log('finish');
})();

	/*
<script>
    document.addEventListener("DOMContentLoaded", function() {
        const estadisticasLinks = document.querySelectorAll("span.statistics-tagTracking-239229791");
        estadisticasLinks[0].addEventListener("click", function(){
            publishVerEstadisticasLinkEvent("239229791");
        }, false);
    });

    function publishVerEstadisticasLinkEvent(adId) {
        const watchStatisticsTracking = new WatchStatisticsTracking(utag_data);
        watchStatisticsTracking.publishWith(adId);
    }
</script>

    </div>
                            </div>
    </div>
 */