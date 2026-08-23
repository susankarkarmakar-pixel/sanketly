require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SanketlyMesh'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.author         = 'Sanketly'
  s.homepage       = 'https://github.com/susankarkarmakar-pixel/sanketly'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :path => '.' }
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version  = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'CoreBluetooth'
end
