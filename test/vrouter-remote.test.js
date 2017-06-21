/* eslint-env mocha */
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const { VRouter } = require(path.join(__dirname, '../js/vrouter-local.js'))
const { VRouterRemote } = require(path.join(__dirname, '../js/vrouter-remote.js'))
const configFile = path.join(__dirname, '../config/config.json')

describe('Test Suite for vrouter-remote', function () {
  // const SSVersion = '3.0.5'
  // const KTVersion = '20170329'
  // const OSVersion = 'CHAOS CALMER (15.05.1, r48532)'
  this.timeout(50000)
  let vrouter
  let remote
  before('connect to vrouter', async function () {
    vrouter = new VRouter(JSON.parse(fs.readFileSync(configFile)))
    const state = await vrouter.getVMState()
    if (state !== 'running') {
      await vrouter.startVM()
        .then(() => {
          return vrouter.wait(30000)
        })
    }
    await vrouter.connect()
      .then((r) => {
        remote = r
      })
      .catch(err => console.log(err))
  })

  after('close vrouter connection', function () {
    remote && remote.close()
  })

  it('connect should return a VRouterRemote object with correct properties', function () {
    return expect(remote instanceof VRouterRemote).to.be.true
  })
  it('remoteExec should be rejected when execute bad commands', function () {
    const promise = remote.remoteExec('non-existed')
    return expect(promise).to.be.rejected
  })
  it('Test Case for getSSVersion', function () {
    return expect(remote.getSSVersion())
      .to.eventually.match(/\d+\.\d+\.\d+/ig)
  })

  it('Test Case for getKTVersion', function () {
    return expect(remote.getKTVersion())
      .to.eventually.match(/\d{8}/ig)
  })

  it('Test Case for getOSVersion', function () {
    return expect(remote.getOSVersion())
      .to.be.eventually.match(/\w+ \w+ \(.*\)/ig)
  })

  it('Test Case for getBrlan', function () {
    return expect(remote.getBrlan())
      .to.eventually.match(/\d+\.\d+\.\d+\.\d+/ig)
  })

  it('Test Case for getWifilan', function () {
    return expect(remote.getWifilan())
      .to.eventually.match(/\d+\.\d+\.\d+.\d+/ig)
  })

  it('Test getProcess', function () {
    return Promise.all([
      remote.getSSProcess(),
      remote.getSSOverKTProcess(),
      remote.getSSDNSProcess(),
      remote.getKTProcess()
    ])
      .then((result) => {
        result.forEach(p => p && console.log(p))
      })
  })

  it('getFile: /etc/config/network must equal generateNetworkCfg()', function () {
    return remote.remoteExec('cat /etc/config/network')
      .then((output) => {
        return expect(output.trim()).to.equal(vrouter.generateNetworkCfg().trim())
      })
  })
  it('Test scp, verify with getFile.', function () {
    const tempName = `scp-testing-${Date.now()}.txt`
    const tempContent = 'hello world'
    const tempFile = path.join(os.tmpdir(), tempName)
    return fs.outputFile(tempFile, tempContent)
      .then(() => {
        // return expect(vrouter.scp(tempFile, '/'))
        // console.log(tempFile)
        return expect(vrouter.scp(tempFile, '/'))
          .to.be.fulfilled
      })
      .then(() => {
        return remote.getFile(`/${tempName}`)
      })
      .then((output) => {
        console.log(output)
        return expect(output).to.equal(tempContent)
      })
      .then(() => {
        return remote.remoteExec(`rm /${tempFile}`)
      })
  })

  it('Test Case for uptime', function () {
    const hours = new Date().getHours()
    return remote.getUptime()
      .then((output) => {
        const h = parseInt(output.split(':')[0], 10)
        expect(h).to.be.equal(hours)
      })
  })
  it.skip('shutdown sould turn vrouter off.', function () {
    return expect(remote.shutdown()).to.be.fulfilled
  })
})
