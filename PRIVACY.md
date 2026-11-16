# PostiTuomarin tietosuojaseloste

Tämä seloste kertoo, mitä tietoja PostiTuomari-lisäosa käsittelee, mihin niitä lähtee ja miten ne
poistetaan. Seloste koskee PostiTuomarin versiota 1.1.2.

## Lyhyesti

- PostiTuomari toimii **omalla koneellasi**, Thunderbirdin sisällä.
- **Kehittäjä ei saa sinusta mitään tietoja.** Lisäosassa ei ole seurantaa, analytiikkaa eikä
  käyttötilastoja.
- Tekoäly on **valinnainen** ja oletuksena pois päältä. Jos otat sen käyttöön, lisäosa lähettää
  OpenAI:lle vain lähettäjän verkkotunnuksen ja viestin otsikon. **Viestin sisältöä ei lähetetä koskaan.**
- Tekoäly käyttää **omaa API-avaintasi**. Sinä olet OpenAI:n asiakas, ja OpenAI:n ehdot koskevat sinua.

## Mitä tietoja lisäosa käsittelee

Lajitellessaan postia lisäosa lukee Thunderbirdistä:

- valitsemiesi tilien Saapuneet-kansion viestien **lähettäjän** (nimi ja osoite) ja **otsikon**
- viestin tunnisteen ja liputuksen (tähti)
- tiliesi ja kansioidesi nimet
- tiliesi omat nimet, jotta ne voidaan piilottaa tekoälylle lähtevästä tekstistä
- osoitekirjan nimet, **vain jos** kytket päälle valinnan *Suojaa myös osoitekirjan nimet*.
  Thunderbird kysyy siihen luvan erikseen.

Lisäosa **ei lue viestien sisältöä** eikä liitteitä.

## Mitä lähtee OpenAI:lle

Vain jos olet ottanut tekoälyn käyttöön ja tallentanut API-avaimen. Silloinkin tekoälyltä kysytään vain
niistä viesteistä, joihin mikään omista säännöistäsi ei sovi.

Jokaisesta viestistä lähtee:

- **lähettäjän verkkotunnus**, esimerkiksi `kauppa.example`. Ilmaisten sähköpostipalveluiden
  lähettäjistä lähtee vain `yksityishenkilö (palvelu.example)`.
- **viestin otsikko**, josta henkilötiedot on ensin korvattu (ks. alla)
- viestin numero Thunderbirdissä, jotta vastaus yhdistetään oikeaan viestiin

Lisäksi lähtee **kategorioidesi nimet** (esim. *Raha*, *Ostokset*), jotta tekoäly voi valita niistä.

Lähettäjän nimi lähtee vain, jos kytket päälle valinnan *Lähetä lähettäjän nimi tekoälylle*.
Oletuksena se on pois.

Esimerkki yhdestä viestistä sellaisena kuin se lähtee:

```json
{ "id": "42", "from": "kauppa.example", "subject": "Tilausvahvistus" }
```

Asetussivun AI-osiossa on esikatselu, joka näyttää tarkalleen, mitä viidestä uusimmasta viestistäsi
lähtisi.

### Mitä poistetaan ennen lähetystä

Otsikosta (ja lähettäjän nimestä, jos sen lähetys on päällä) korvataan ennen lähetystä:

| Mitä                                                                 | Korvataan merkinnällä |
|----------------------------------------------------------------------|-----------------------|
| sähköpostiosoite, myös peitelty (esim. `nimi (at) palvelu.example`, `nimi at palvelu dot com`) | `[osoite]` |
| henkilötunnus                                                        | `[hetu]`              |
| puhelinnumero: matkapuhelin-, lanka- ja palvelunumerot, myös ilman välilyöntejä | `[puhelin]` |
| tilinumero (IBAN)                                                    | `[tilinumero]`        |
| maksukortin numero                                                   | `[kortti]`            |
| katuosoite (kadunnimi, numero, porras tai huoneisto)                 | `[katuosoite]`        |
| postinumero, kun perässä on paikkakunta (esim. 00100 Helsinki)       | `[postinumero]`       |
| auton rekisterinumero (esim. ABC-123, abc 123, ABC123)               | `[rekisteri]`         |
| oma nimesi (Thunderbirdin tilien tiedoista)                          | `[nimi]`              |
| *Suojattavat nimet ja sanat* -listan sanat                           | `[nimi]`              |
| osoitekirjan nimet (jos valitset)                                    | `[nimi]`              |

Nimet tunnistetaan myös taivutettuina, esimerkiksi *Teemun*, *Teemulle* ja *Testaajalta*. Hyvin lyhyet
nimet (alle 4 kirjainta) tunnistetaan vain täsmälleen samassa muodossa.

Lähettäjän osoitteesta ei lähetetä koskaan @-merkkiä edeltävää osaa.

**Viimeinen tarkistus:** jos lähtevässä tiedossa on korvaamisen jälkeenkin sähköpostiosoite,
henkilötunnus tai kortin numero, sitä erää ei lähetetä lainkaan.

### Mitä tunnistus ei löydä

- **Vieraiden ihmisten nimiä ei tunnisteta.** Lisäosa tuntee vain oman nimesi, suojattavien nimien
  listan ja osoitekirjan nimet, jos olet kytkenyt niiden suojauksen päälle. Jos otsikossa on jonkun muun
  nimi, se lähtee tekoälylle sellaisenaan.
- Tunnistus perustuu tavallisiin suomalaisiin muotoihin. Poikkeuksellisesti kirjoitettu numero,
  ulkomainen osoite tai harvinainen nimen taivutusmuoto voi jäädä tunnistamatta.

Jos jonkun lähettäjän viestejä ei saa lähettää tekoälylle lainkaan, lisää lähettäjä listaan
*Säännöt → Älä koskaan lähetä AI:lle*.

## Mitä ei lähde mihinkään

- viestien sisältö ja liitteet
- lähettäjien sähköpostiosoitteet
- vastaanottajat
- osoitekirjasi
- sääntösi, asetuksesi ja muistit
- API-avaimesi salasana

Ainoa verkkoyhteys, jonka lisäosa avaa, on OpenAI:n rajapintaan (`https://api.openai.com`), ja vain kun
tekoäly on käytössä. Lisäosan sisäinen suojaus (CSP) estää kaikki muut verkkoyhteydet.

## Missä tiedot säilytetään

Kaikki tallennetut tiedot ovat **Thunderbirdin profiilissa omalla koneellasi**:

- asetukset, kategoriat ja säännöt
- *Älä koskaan lähetä AI:lle* -lista
- muistit: viestit, jotka olet siirtänyt itse, ja viestit, joista tekoäly ei osannut päättää. Näistä
  tallennetaan vain viestin tunniste, kansio ja aika, ei lähettäjää eikä otsikkoa.
- viimeisimmän lajittelun yhteenveto (vain määriä)
- API-avain (ks. alla)

Osoitekirjan ja tilien nimiä ei tallenneta. Ne luetaan Thunderbirdistä aina tarvittaessa.

Lisäosan lokiin (Thunderbirdin kehittäjätyökalujen konsoli omalla koneellasi) kirjoitetaan oletuksena
vain määriä, kategorioita ja virheitä. Lähettäjät ja otsikot näkyvät siellä vain, jos kytket päälle
*Yksityiskohtainen loki (vianetsintään)*.

Jos teet **vientitiedoston**, se tallentuu sinne, minne sen tallennat. Siinä on sääntösi, jotka voivat
sisältää osoitteita, verkkotunnuksia ja nimiä. API-avain ei ole koskaan vientitiedostossa.

## API-avaimen säilytys

- Ilman salasanaa avain tallennetaan **salaamattomana** Thunderbirdin profiiliin tällä koneella.
- **Salasanasuojaus (suositus):** avain salataan antamallasi salasanalla. Salasanaa ei tallenneta.
  Avattu avain pidetään vain muistissa, ja se häviää, kun Thunderbird suljetaan.
- Avain lähetetään vain OpenAI:lle pyynnön tunnistamiseen. Se ei ole koskaan vientitiedostossa,
  lokissa eikä virheilmoituksissa. Asetussivulla näkyvät vain sen neljä viimeistä merkkiä.
- Suosittelemme avainta, jolla on rajatut oikeudet ja budjettiraja. Ohje on README-tiedostossa.

## Tekoäly on valinnainen

Lisäosa toimii ilman tekoälyä pelkillä omilla säännöilläsi. Tekoäly on oletuksena pois päältä.

Kun otat sen käyttöön, tiedot kulkevat suoraan sinun koneeltasi OpenAI:lle **sinun omalla
API-avaimellasi**. Kehittäjä ei ole välissä eikä näe pyyntöjä. Sinä olet OpenAI:n asiakas: OpenAI:n
käyttöehdot ja tietosuojakäytäntö koskevat sinua, ja OpenAI päättää itse, miten se käsittelee sille
lähetettyjä tietoja. Lue OpenAI:n tietosuojakäytäntö:
<https://openai.com/policies/privacy-policy/>

## Miten tiedot poistetaan

| Mitä                                | Miten                                                                    |
|-------------------------------------|--------------------------------------------------------------------------|
| API-avain                           | *Asetukset → AI → Poista avain*                                          |
| muistit                             | *Asetukset → Tiedot → Muistit → Tyhjennä*                                |
| osoitekirjan käyttölupa             | kytke *Suojaa myös osoitekirjan nimet* pois, jolloin lupa poistetaan     |
| kaikki lisäosan tallentamat tiedot  | poista lisäosa: *Lisäosat ja teemat → PostiTuomari → Poista*             |
| vientitiedostot                     | poista tiedosto itse sieltä, minne sen tallensit                         |
| OpenAI:lle jo lähetetyt tiedot      | OpenAI:n omien käytäntöjen mukaan; kehittäjällä ei ole niihin pääsyä     |

Lisäosan poistaminen ei poista sähköpostejasi eikä kansioita, joihin lisäosa on siirtänyt viestejä.
Ne jäävät Thunderbirdiin.

## Muutokset

Jos lisäosan tietojen käsittely muuttuu, tämä seloste päivitetään samassa yhteydessä.
