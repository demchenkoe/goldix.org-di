const glob = require('glob');
const di = require('di');

class Builder {
  
  constructor({config, definitions, options}) {
    
    this.config = {
      ...config
    };
    
    this.definitions = {
      config: ['value', config],
      ...definitions
    };
    
    this.aliasesForFindPatterns = {
      common: {patterns: '**/*.js'},
      lib: {patterns: 'lib/**/*.js'},
      modules: {patterns: 'modules/**/*.js'},
      ...this.config.aliasesForFindPatterns
    };
    
    
    this.options = {
      global$injector: '$injector',   //setup to null for disable
      ...options,
      glob: {
        cwd: config.cwd || process.cwd(),
        realpath: true,
        ...options.glob
      },
    };
  }
  
  /**
   * return true if module disabled
   * @param mod
   * @returns {boolean}
   * @private
   */
  
  _isDisabled(mod) {
    switch (typeof mod._diOff) {
      case 'function':
        return !!mod._diOff();
        break;
      case 'undefined':
        return false;
        break;
      default:
        return !!mod._diOff;
    }
  }
  
  /**
   * load module
   * Ignore files with "_diOff" in file name
   * @param filename
   */
  
  loadModule(filename) {
    if (filename.indexOf('_diOff') !== -1) {
      return this;
    }
    let mod = require(filename);
    
    if (this._isDisabled(mod)) {
      return;
    }
    Object.keys(mod).forEach(defName => {
      if (typeof defName !== 'string' || defName.substr(0, 1) === '_') {  //ignore definition with prefix "_"
        return;
      }
      const v = mod[defName];
      if (!Array.isArray(v)) return;
      if (typeof v[0] !== 'string') return;
      if (['type', 'factory', 'value'].indexOf(v[0]) === -1) return;
      
      if (this.definitions.hasOwnProperty(defName)) {
        console.warn(`${defName} already defined. Definition at ${filename} will be ignored.`);
        return;
      }
      
      //add new definition
      
      this.definitions[defName] = v;
    });
    
    return this;
  }
  
  /**
   * find and load modules
   * @param pattern
   * @param options
   */
  
  
  findModuleAndLoad(patterns, options) {
    if (typeof patterns === 'string' && this.aliasesForFindPatterns.hasOwnProperty(patterns)) {
      let alias = this.aliasesForFindPatterns[patterns];
      patterns = alias.patterns;
      options = alias.options || options;
    }
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    
    options = {
      ...this.options.glob,
      ...options
    };
    
    patterns.forEach((_pattern) => {
      glob.sync(_pattern, options).forEach(filename => this.loadModule(filename));
    });
    return this;
  }
  
  /**
   * create injector
   * @param redefine
   * @returns {*}
   */
  
  createInjector(redefine) {
    return new di.Injector([
      {...this.definitions, ...redefine}
    ]);
  }
  
  invoke(run, injector, redefine) {
    if (!injector) {
      injector = this.createInjector(redefine);
    }
    if(this.options.global$injector) {
      global[this.options.global$injector] = injector;
    }
    injector.invoke(run);
  }
  
}

module.exports =  {Builder, di, glob};
